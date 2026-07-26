const prisma = require("../models/prisma");
const auditLogService = require("./audit-log");
const glService = require("./gl-service");

// ═══════════════════════════════════════════════════════════════════
// BUDGET MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

async function createBudget({ name, entityId, fiscalYear, lineItems, entity }) {
  const budget = await prisma.budget.create({
    data: {
      name,
      entityId: entityId || null,
      fiscalYear,
      status: "DRAFT",
      entity: entity || "default",
      totalBudgetCents: 0
    }
  });

  let totalBudget = 0;

  if (lineItems && lineItems.length > 0) {
    for (const item of lineItems) {
      await prisma.budgetLineItem.create({
        data: {
          budgetId: budget.id,
          accountId: item.accountId,
          period: item.period,
          budgetCents: BigInt(item.budgetCents),
          notes: item.notes || null
        }
      });
      totalBudget += item.budgetCents;
    }

    await prisma.budget.update({
      where: { id: budget.id },
      data: { totalBudgetCents: BigInt(totalBudget) }
    });
  }

  await auditLogService.pushActivity({
    category: "BUDGET",
    text: `Budget "${name}" created for FY${fiscalYear} with ${(totalBudget / 100).toFixed(2)} total.`,
    metadata: { budgetId: budget.id, fiscalYear, totalBudget }
  });

  return budget;
}

async function approveBudget(budgetId, approvedBy) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId } });

  if (!budget) {
    const err = new Error("Budget not found");
    err.statusCode = 404;
    throw err;
  }

  if (budget.status !== "DRAFT") {
    const err = new Error(`Cannot approve budget in status: ${budget.status}`);
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.budget.update({
    where: { id: budgetId },
    data: { status: "APPROVED", approvedBy, approvedAt: new Date() }
  });

  await auditLogService.pushActivity({
    category: "BUDGET",
    text: `Budget "${budget.name}" approved by ${approvedBy || "system"}.`,
    metadata: { budgetId, approvedBy }
  });

  return updated;
}

async function activateBudget(budgetId) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId } });

  if (!budget) {
    const err = new Error("Budget not found");
    err.statusCode = 404;
    throw err;
  }

  if (budget.status !== "APPROVED") {
    const err = new Error(`Cannot activate budget in status: ${budget.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Close any other active budgets for same fiscal year
  await prisma.budget.updateMany({
    where: { fiscalYear: budget.fiscalYear, status: "ACTIVE" },
    data: { status: "CLOSED" }
  });

  const updated = await prisma.budget.update({
    where: { id: budgetId },
    data: { status: "ACTIVE" }
  });

  await auditLogService.pushActivity({
    category: "BUDGET",
    text: `Budget "${budget.name}" activated for FY${budget.fiscalYear}.`,
    metadata: { budgetId, fiscalYear: budget.fiscalYear }
  });

  return updated;
}

// ═══════════════════════════════════════════════════════════════════
// VARIANCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════

async function calculateVariance(budgetId, period, { criticalThresholdPct = 20, warningThresholdPct = 10 } = {}) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: { lineItems: { include: { account: true } } }
  });

  if (!budget) {
    const err = new Error("Budget not found");
    err.statusCode = 404;
    throw err;
  }

  const variances = [];
  let totalBudget = 0;
  let totalActual = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let onTrackCount = 0;

  for (const line of budget.lineItems) {
    if (period && line.period !== period) continue;

    // Get actual from GL
    const actual = await glService.getAccountBalance(line.accountId, null, null);
    const actualCents = Math.abs(actual.balance);
    const budgetCents = Number(line.budgetCents);
    const varianceCents = actualCents - budgetCents;
    const variancePct = budgetCents > 0 ? (varianceCents / budgetCents) * 100 : 0;

    let flag = "OK";
    if (Math.abs(variancePct) >= criticalThresholdPct) {
      flag = "CRITICAL";
      criticalCount++;
    } else if (Math.abs(variancePct) >= warningThresholdPct) {
      flag = "WARNING";
      warningCount++;
    } else {
      onTrackCount++;
    }

    const variance = {
      accountId: line.accountId,
      accountCode: line.account.code,
      accountName: line.account.name,
      period: line.period,
      budgetCents,
      actualCents,
      varianceCents,
      variancePct: parseFloat(variancePct.toFixed(2)),
      isOverBudget: actualCents > budgetCents,
      flag
    };

    variances.push(variance);

    // Store variance record
    await prisma.budgetVariance.create({
      data: {
        budgetId,
        accountId: line.accountId,
        period: line.period,
        budgetCents: BigInt(budgetCents),
        actualCents: BigInt(actualCents),
        varianceCents: BigInt(varianceCents),
        variancePct: variancePct,
        isOverBudget: actualCents > budgetCents,
        flag,
        calculatedAt: new Date()
      }
    });

    totalBudget += budgetCents;
    totalActual += actualCents;
  }

  const report = {
    budgetId,
    period: period || "ALL",
    totalBudgetCents: totalBudget,
    totalActualCents: totalActual,
    totalVarianceCents: totalActual - totalBudget,
    totalVariancePct: totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0,
    variances,
    summary: {
      overBudgetCount: variances.filter(v => v.isOverBudget).length,
      underBudgetCount: variances.filter(v => !v.isOverBudget).length,
      onTrackCount,
      criticalCount,
      warningCount
    }
  };

  await auditLogService.pushActivity({
    category: "BUDGET_VARIANCE",
    text: `Variance analysis for "${budget.name}" ${period || "FY"}: ${criticalCount} critical, ${warningCount} warning, ${onTrackCount} on track.`,
    metadata: { budgetId, period, criticalCount, warningCount, onTrackCount }
  });

  return report;
}

async function getVarianceHistory(budgetId, { limit = 100 } = {}) {
  return prisma.budgetVariance.findMany({
    where: { budgetId },
    include: { account: true },
    orderBy: { calculatedAt: "desc" },
    take: limit
  });
}

async function getBudgets({ fiscalYear, status, entity, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (fiscalYear) where.fiscalYear = fiscalYear;
  if (status) where.status = status;
  if (entity) where.entity = entity;

  const [budgets, total] = await Promise.all([
    prisma.budget.findMany({
      where,
      include: { lineItems: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.budget.count({ where })
  ]);

  return { budgets, total, limit, offset };
}

module.exports = {
  createBudget,
  approveBudget,
  activateBudget,
  calculateVariance,
  getVarianceHistory,
  getBudgets
};
