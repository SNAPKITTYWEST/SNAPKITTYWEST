const prisma = require("../models/prisma");
const auditLogService = require("./audit-log");

async function generateEntryNumber() {
  const year = new Date().getFullYear();
  const last = await prisma.journalEntry.findFirst({
    where: { entryNumber: { startsWith: `JE-${year}-` } },
    orderBy: { entryNumber: "desc" }
  });

  if (!last) return `JE-${year}-00001`;
  const seq = parseInt(last.entryNumber.split("-")[2], 10) + 1;
  return `JE-${year}-${String(seq).padStart(5, "0")}`;
}

async function createJournalEntry({ date, description, reference, source, lines, entity, createdBy }) {
  // Validate debits = credits
  const totalDebits = lines.reduce((sum, l) => sum + (l.debitCents || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (l.creditCents || 0), 0);

  if (totalDebits !== totalCredits) {
    const err = new Error(`Journal entry imbalance: debits=${totalDebits}, credits=${totalCredits}`);
    err.statusCode = 400;
    throw err;
  }

  if (totalDebits === 0) {
    const err = new Error("Journal entry must have non-zero amounts");
    err.statusCode = 400;
    throw err;
  }

  if (!lines || lines.length < 2) {
    const err = new Error("Journal entry requires at least 2 lines");
    err.statusCode = 400;
    throw err;
  }

  // Validate all accounts exist
  for (const line of lines) {
    const account = await prisma.account.findUnique({ where: { id: line.accountId } });
    if (!account) {
      const err = new Error(`Account not found: ${line.accountId}`);
      err.statusCode = 400;
      throw err;
    }
  }

  const entryNumber = await generateEntryNumber();

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: new Date(date),
      description,
      reference: reference || null,
      source: source || "MANUAL",
      status: "DRAFT",
      entity: entity || "default",
      createdBy: createdBy || null,
      lines: {
        create: lines.map(l => ({
          accountId: l.accountId,
          debitCents: BigInt(l.debitCents || 0),
          creditCents: BigInt(l.creditCents || 0),
          description: l.description || null,
          contactId: l.contactId || null
        }))
      }
    },
    include: { lines: { include: { account: true } } }
  });

  await auditLogService.pushActivity({
    category: "JOURNAL_ENTRY",
    text: `Draft journal entry ${entryNumber} created: ${description}`,
    metadata: { entryNumber, totalDebits: totalDebits, source: source || "MANUAL" }
  });

  return entry;
}

async function postJournalEntry(entryId) {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true }
  });

  if (!entry) {
    const err = new Error("Journal entry not found");
    err.statusCode = 404;
    throw err;
  }

  if (entry.status !== "DRAFT") {
    const err = new Error(`Cannot post entry in status: ${entry.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Re-validate balance
  let totalDebits = 0n;
  let totalCredits = 0n;
  for (const line of entry.lines) {
    totalDebits += line.debitCents;
    totalCredits += line.creditCents;
  }

  if (totalDebits !== totalCredits) {
    const err = new Error("Journal entry is not balanced");
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.journalEntry.update({
    where: { id: entryId },
    data: { status: "POSTED", postedAt: new Date() },
    include: { lines: { include: { account: true } } }
  });

  await auditLogService.pushActivity({
    category: "JOURNAL_ENTRY",
    text: `Journal entry ${entry.entryNumber} posted.`,
    metadata: { entryNumber: entry.entryNumber }
  });

  return updated;
}

async function reverseJournalEntry(entryId, description) {
  const original = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: true }
  });

  if (!original) {
    const err = new Error("Journal entry not found");
    err.statusCode = 404;
    throw err;
  }

  if (original.status !== "POSTED") {
    const err = new Error("Can only reverse posted entries");
    err.statusCode = 400;
    throw err;
  }

  // Create reversal: swap debits and credits
  const reversalLines = original.lines.map(l => ({
    accountId: l.accountId,
    debitCents: Number(l.creditCents),
    creditCents: Number(l.debitCents),
    description: `Reversal of ${original.entryNumber}`,
    contactId: l.contactId
  }));

  const reversal = await createJournalEntry({
    date: new Date(),
    description: description || `Reversal of ${original.entryNumber}`,
    reference: original.entryNumber,
    source: "REVERSAL",
    lines: reversalLines,
    entity: original.entity,
    createdBy: original.createdBy
  });

  // Post the reversal and void the original
  await postJournalEntry(reversal.id);

  await prisma.journalEntry.update({
    where: { id: entryId },
    data: { status: "REVERSED", reversedBy: reversal.entryNumber }
  });

  await auditLogService.pushActivity({
    category: "JOURNAL_ENTRY",
    text: `Journal entry ${original.entryNumber} reversed as ${reversal.entryNumber}.`,
    metadata: { original: original.entryNumber, reversal: reversal.entryNumber }
  });

  return reversal;
}

async function voidJournalEntry(entryId) {
  const entry = await prisma.journalEntry.findUnique({ where: { id: entryId } });

  if (!entry) {
    const err = new Error("Journal entry not found");
    err.statusCode = 404;
    throw err;
  }

  if (entry.status === "VOID") {
    const err = new Error("Entry is already void");
    err.statusCode = 400;
    throw err;
  }

  if (entry.status === "POSTED") {
    const err = new Error("Cannot void a posted entry — reverse it instead");
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.journalEntry.update({
    where: { id: entryId },
    data: { status: "VOID" }
  });

  await auditLogService.pushActivity({
    category: "JOURNAL_ENTRY",
    text: `Journal entry ${entry.entryNumber} voided.`,
    metadata: { entryNumber: entry.entryNumber }
  });

  return updated;
}

async function getJournalEntries({ entity, status, startDate, endDate, source, limit = 50, offset = 0 } = {}) {
  const where = {};

  if (entity) where.entity = entity;
  if (status) where.status = status;
  if (source) where.source = source;
  if (startDate || endDate) {
    where.date = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: { lines: { include: { account: true } } },
      orderBy: [{ date: "desc" }, { entryNumber: "desc" }],
      take: limit,
      skip: offset
    }),
    prisma.journalEntry.count({ where })
  ]);

  return { entries, total, limit, offset };
}

async function getRecurringEntries() {
  return prisma.journalEntry.findMany({
    where: { status: "POSTED", recurring: { not: null } },
    include: { lines: { include: { account: true } } }
  });
}

module.exports = {
  createJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
  voidJournalEntry,
  getJournalEntries,
  getRecurringEntries,
  generateEntryNumber
};
