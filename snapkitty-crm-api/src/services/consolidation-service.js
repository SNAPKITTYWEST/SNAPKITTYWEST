const prisma = require("../models/prisma");
const auditLogService = require("./audit-log");
const journalService = require("./journal-service");
const glService = require("./gl-service");

// ═══════════════════════════════════════════════════════════════════
// ENTITY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

async function createEntity({ code, name, type, parentId, currency }) {
  const existing = await prisma.entity.findUnique({ where: { code } });
  if (existing) {
    const err = new Error(`Entity code ${code} already exists`);
    err.statusCode = 400;
    throw err;
  }

  const entity = await prisma.entity.create({
    data: {
      code,
      name,
      type,
      parentId: parentId || null,
      currency: currency || "USD"
    }
  });

  await auditLogService.pushActivity({
    category: "ENTITY",
    text: `Entity ${name} (${code}) created as ${type}.`,
    metadata: { entityId: entity.id, code, type }
  });

  return entity;
}

async function getEntities() {
  return prisma.entity.findMany({
    where: { isActive: true },
    include: { parent: true, children: true },
    orderBy: { code: "asc" }
  });
}

// ═══════════════════════════════════════════════════════════════════
// INTERCOMPANY TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════

async function createIntercompanyTransaction({ transactionType, fromEntityId, toEntityId, amountCents, description, reference, entity }) {
  const fromEntity = await prisma.entity.findUnique({ where: { id: fromEntityId } });
  const toEntity = await prisma.entity.findUnique({ where: { id: toEntityId } });

  if (!fromEntity || !toEntity) {
    const err = new Error("Invalid entity ID(s)");
    err.statusCode = 400;
    throw err;
  }

  if (fromEntityId === toEntityId) {
    const err = new Error("Cannot create intercompany transaction to same entity");
    err.statusCode = 400;
    throw err;
  }

  const icTxn = await prisma.intercompanyTransaction.create({
    data: {
      transactionType,
      fromEntityId,
      toEntityId,
      amountCents: BigInt(amountCents),
      description,
      reference: reference || null,
      status: "PENDING",
      entity: entity || "default"
    },
    include: { fromEntity: true, toEntity: true }
  });

  await auditLogService.pushActivity({
    category: "IC_TRANSACTION",
    text: `Intercompany ${transactionType}: ${fromEntity.name} → ${toEntity.name} for ${(Number(amountCents) / 100).toFixed(2)}`,
    metadata: { icTxnId: icTxn.id, transactionType, from: fromEntity.code, to: toEntity.code }
  });

  return icTxn;
}

async function approveIntercompanyTransaction(icTxnId) {
  const txn = await prisma.intercompanyTransaction.findUnique({
    where: { id: icTxnId },
    include: { fromEntity: true, toEntity: true }
  });

  if (!txn) {
    const err = new Error("Intercompany transaction not found");
    err.statusCode = 404;
    throw err;
  }

  if (txn.status !== "PENDING") {
    const err = new Error(`Cannot approve transaction in status: ${txn.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Create journal entries for both entities
  const fromCashAccount = await glService.getAccountByCode("1000");
  const toCashAccount = await glService.getAccountByCode("1000");

  // From entity: credit cash (outflow)
  const jeFrom = await journalService.createJournalEntry({
    date: new Date(),
    description: `IC Transfer OUT: ${txn.description}`,
    reference: txn.reference || `IC-${txn.id.slice(0, 8)}`,
    source: "MANUAL",
    entity: txn.fromEntity.code,
    lines: [
      { accountId: fromCashAccount.id, creditCents: Number(txn.amountCents), description: `IC to ${txn.toEntity.name}` },
      { accountId: fromCashAccount.id, debitCents: Number(txn.amountCents), description: `IC to ${txn.toEntity.name}` }
    ]
  });

  // To entity: debit cash (inflow)
  const jeTo = await journalService.createJournalEntry({
    date: new Date(),
    description: `IC Transfer IN: ${txn.description}`,
    reference: txn.reference || `IC-${txn.id.slice(0, 8)}`,
    source: "MANUAL",
    entity: txn.toEntity.code,
    lines: [
      { accountId: toCashAccount.id, debitCents: Number(txn.amountCents), description: `IC from ${txn.fromEntity.name}` },
      { accountId: toCashAccount.id, creditCents: Number(txn.amountCents), description: `IC from ${txn.fromEntity.name}` }
    ]
  });

  await journalService.postJournalEntry(jeFrom.id);
  await journalService.postJournalEntry(jeTo.id);

  const updated = await prisma.intercompanyTransaction.update({
    where: { id: icTxnId },
    data: {
      status: "APPROVED",
      journalEntryFromId: jeFrom.id,
      journalEntryToId: jeTo.id
    }
  });

  await auditLogService.pushActivity({
    category: "IC_TRANSACTION",
    text: `Intercompany transaction approved: ${txn.fromEntity.name} → ${txn.toEntity.name}. JEs ${jeFrom.entryNumber}, ${jeTo.entryNumber} posted.`,
    metadata: { icTxnId, from: txn.fromEntity.code, to: txn.toEntity.code }
  });

  return updated;
}

async function eliminateIntercompanyTransactions(period) {
  const txns = await prisma.intercompanyTransaction.findMany({
    where: { status: "APPROVED" },
    include: { fromEntity: true, toEntity: true }
  });

  let eliminatedCount = 0;

  for (const txn of txns) {
    // Create elimination JE
    const apAccount = await glService.getAccountByCode("2000");
    const arAccount = await glService.getAccountByCode("1100");

    const jeElim = await journalService.createJournalEntry({
      date: new Date(),
      description: `IC Elimination: ${txn.description}`,
      reference: `ELIM-${txn.id.slice(0, 8)}`,
      source: "MANUAL",
      entity: txn.fromEntity.code,
      lines: [
        { accountId: apAccount.id, debitCents: Number(txn.amountCents), description: `Eliminate IC with ${txn.toEntity.name}` },
        { accountId: arAccount.id, creditCents: Number(txn.amountCents), description: `Eliminate IC with ${txn.fromEntity.name}` }
      ]
    });

    await journalService.postJournalEntry(jeElim.id);

    await prisma.intercompanyTransaction.update({
      where: { id: txn.id },
      data: { status: "ELIMINATED", eliminatedAt: new Date() }
    });

    eliminatedCount++;
  }

  await auditLogService.pushActivity({
    category: "IC_ELIMINATION",
    text: `${eliminatedCount} intercompany transactions eliminated for period ${period || "current"}.`,
    metadata: { eliminatedCount, period }
  });

  return { eliminatedCount };
}

async function getIntercompanyTransactions({ status, entity, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (status) where.status = status;
  if (entity) where.entity = entity;

  const [txns, total] = await Promise.all([
    prisma.intercompanyTransaction.findMany({
      where,
      include: { fromEntity: true, toEntity: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.intercompanyTransaction.count({ where })
  ]);

  return { transactions: txns, total, limit, offset };
}

// ═══════════════════════════════════════════════════════════════════
// CONSOLIDATED FINANCIALS
// ═══════════════════════════════════════════════════════════════════

async function getConsolidatedTrialBalance(asOfDate) {
  const entities = await prisma.entity.findMany({ where: { isActive: true } });
  const consolidated = {};

  for (const entity of entities) {
    const trialBalance = await glService.getTrialBalance(entity.code, asOfDate);
    for (const acct of trialBalance.accounts) {
      if (!consolidated[acct.code]) {
        consolidated[acct.code] = { code: acct.code, name: acct.name, type: acct.type, debit: 0, credit: 0 };
      }
      consolidated[acct.code].debit += acct.debit;
      consolidated[acct.code].credit += acct.credit;
    }
  }

  const accounts = Object.values(consolidated);
  let totalDebits = 0;
  let totalCredits = 0;

  for (const acct of accounts) {
    totalDebits += acct.debit;
    totalCredits += acct.credit;
  }

  return {
    accounts,
    totalDebits,
    totalCredits,
    isBalanced: totalDebits === totalCredits,
    entityCount: entities.length,
    asOfDate: asOfDate || new Date().toISOString()
  };
}

async function getConsolidatedBalanceSheet(asOfDate) {
  const entities = await prisma.entity.findMany({ where: { isActive: true } });
  const consolidated = { assets: [], liabilities: [], equity: [] };
  let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

  for (const entity of entities) {
    const bs = await glService.getBalanceSheet(entity.code, asOfDate);
    for (const item of bs.assets) {
      consolidated.assets.push({ ...item, entityCode: entity.code });
      totalAssets += item.balance;
    }
    for (const item of bs.liabilities) {
      consolidated.liabilities.push({ ...item, entityCode: entity.code });
      totalLiabilities += item.balance;
    }
    for (const item of bs.equity) {
      consolidated.equity.push({ ...item, entityCode: entity.code });
      totalEquity += item.balance;
    }
  }

  return {
    ...consolidated,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced: totalAssets === (totalLiabilities + totalEquity),
    asOfDate: asOfDate || new Date().toISOString()
  };
}

async function getConsolidatedProfitAndLoss(startDate, endDate) {
  const entities = await prisma.entity.findMany({ where: { isActive: true } });
  const consolidated = { revenue: [], expenses: [] };
  let totalRevenue = 0, totalExpenses = 0;

  for (const entity of entities) {
    const pnl = await glService.getProfitAndLoss(entity.code, startDate, endDate);
    for (const item of pnl.revenue) {
      consolidated.revenue.push({ ...item, entityCode: entity.code });
      totalRevenue += item.balance;
    }
    for (const item of pnl.expenses) {
      consolidated.expenses.push({ ...item, entityCode: entity.code });
      totalExpenses += item.balance;
    }
  }

  return {
    ...consolidated,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    startDate: startDate || null,
    endDate: endDate || new Date().toISOString()
  };
}

module.exports = {
  createEntity,
  getEntities,
  createIntercompanyTransaction,
  approveIntercompanyTransaction,
  eliminateIntercompanyTransactions,
  getIntercompanyTransactions,
  getConsolidatedTrialBalance,
  getConsolidatedBalanceSheet,
  getConsolidatedProfitAndLoss
};
