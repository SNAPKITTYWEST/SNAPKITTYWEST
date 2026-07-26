const prisma = require("../models/prisma");
const auditLogService = require("./audit-log");

async function getPlaidTransactions(itemId, startDate, endDate) {
  // In production, this calls the Plaid API
  // For now, returns placeholder structure
  return {
    itemId,
    transactions: [],
    startDate,
    endDate,
    totalTransactions: 0
  };
}

async function getUnreconciledJournalLines(accountId, startDate, endDate) {
  return prisma.journalLine.findMany({
    where: {
      accountId,
      journalEntry: {
        status: "POSTED",
        ...(startDate || endDate ? {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          }
        } : {})
      }
    },
    include: { journalEntry: true, account: true },
    orderBy: { journalEntry: { date: "asc" } }
  });
}

async function createReconciliation({ accountId, statementDate, statementBalanceCents, discrepancies, entity }) {
  // Calculate book balance from GL
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      journalEntry: { status: "POSTED" }
    }
  });

  let bookBalanceCents = 0n;
  const account = await prisma.account.findUnique({ where: { id: accountId } });

  for (const line of lines) {
    if (account.normalBalance === "DEBIT") {
      bookBalanceCents += line.debitCents - line.creditCents;
    } else {
      bookBalanceCents += line.creditCents - line.debitCents;
    }
  }

  const recon = await prisma.bankReconciliation.create({
    data: {
      accountId,
      statementDate: new Date(statementDate),
      statementBalanceCents: BigInt(statementBalanceCents),
      bookBalanceCents,
      status: "OPEN",
      discrepancies: discrepancies || [],
      entity: entity || "default"
    }
  });

  await auditLogService.pushActivity({
    category: "BANK_RECON",
    text: `Bank reconciliation created for ${account.name}. Statement: $${(Number(statementBalanceCents) / 100).toFixed(2)}, Book: $${(Number(bookBalanceCents) / 100).toFixed(2)}`,
    metadata: {
      reconciliationId: recon.id,
      accountId,
      statementBalance: Number(statementBalanceCents),
      bookBalance: Number(bookBalanceCents),
      delta: Number(statementBalanceCents - bookBalanceCents)
    }
  });

  return recon;
}

async function matchTransaction(reconciliationId, plaidTxnId, journalLineId, amountCents) {
  const recon = await prisma.bankReconciliation.findUnique({ where: { id: reconciliationId } });
  if (!recon) {
    const err = new Error("Reconciliation not found");
    err.statusCode = 404;
    throw err;
  }

  if (recon.status !== "OPEN") {
    const err = new Error("Reconciliation is not open");
    err.statusCode = 400;
    throw err;
  }

  const discrepancies = recon.discrepancies || [];
  const match = {
    plaidTxnId,
    journalLineId,
    amountCents: Number(amountCents),
    matchedAt: new Date().toISOString()
  };

  // Remove from discrepancies if it was there
  const filtered = discrepancies.filter(d => d.plaidTxnId !== plaidTxnId);
  filtered.push(match);

  const updated = await prisma.bankReconciliation.update({
    where: { id: reconciliationId },
    data: { discrepancies: filtered }
  });

  return updated;
}

async function completeReconciliation(reconciliationId, reconciledBy) {
  const recon = await prisma.bankReconciliation.findUnique({ where: { id: reconciliationId } });
  if (!recon) {
    const err = new Error("Reconciliation not found");
    err.statusCode = 404;
    throw err;
  }

  if (recon.status !== "OPEN") {
    const err = new Error("Reconciliation is not open");
    err.statusCode = 400;
    throw err;
  }

  // Check if balanced
  const delta = recon.statementBalanceCents - recon.bookBalanceCents;
  const unmatched = (recon.discrepancies || []).filter(d => d.matchedAt);

  if (delta !== 0n && unmatched.length > 0) {
    const err = new Error(`Reconciliation is off by $${(Number(delta) / 100).toFixed(2)}. ${unmatched.length} unmatched transactions.`);
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.bankReconciliation.update({
    where: { id: reconciliationId },
    data: {
      status: "RECONCILED",
      reconciledBy: reconciledBy || "system",
      reconciledAt: new Date()
    }
  });

  const account = await prisma.account.findUnique({ where: { id: recon.accountId } });

  await auditLogService.pushActivity({
    category: "BANK_RECON",
    text: `Bank reconciliation completed for ${account.name}. Delta: $${(Number(delta) / 100).toFixed(2)}`,
    metadata: {
      reconciliationId,
      accountName: account.name,
      delta: Number(delta),
      reconciledBy: reconciledBy || "system"
    }
  });

  return updated;
}

async function getReconciliations({ accountId, status, entity, limit = 20, offset = 0 } = {}) {
  const where = {};
  if (accountId) where.accountId = accountId;
  if (status) where.status = status;
  if (entity) where.entity = entity;

  const [reconciliations, total] = await Promise.all([
    prisma.bankReconciliation.findMany({
      where,
      include: { /* account relation is implicit via accountId */ },
      orderBy: { statementDate: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.bankReconciliation.count({ where })
  ]);

  return { reconciliations, total, limit, offset };
}

module.exports = {
  createReconciliation,
  matchTransaction,
  completeReconciliation,
  getReconciliations,
  getPlaidTransactions,
  getUnreconciledJournalLines
};
