const consolidationService = require("../services/consolidation-service");
const budgetService = require("../services/budget-service");
const locService = require("../services/loc-service");

// ── Entity Management ─────────────────────────────────────────────────────────

async function createEntity(req, res, next) {
  try {
    const entity = await consolidationService.createEntity(req.body);
    res.status(201).json(entity);
  } catch (error) {
    next(error);
  }
}

async function getEntities(req, res, next) {
  try {
    const entities = await consolidationService.getEntities();
    res.json({ entities });
  } catch (error) {
    next(error);
  }
}

// ── Intercompany Transactions ─────────────────────────────────────────────────

async function createICTransaction(req, res, next) {
  try {
    const txn = await consolidationService.createIntercompanyTransaction(req.body);
    res.status(201).json(txn);
  } catch (error) {
    next(error);
  }
}

async function approveICTransaction(req, res, next) {
  try {
    const { txnId } = req.params;
    const txn = await consolidationService.approveIntercompanyTransaction(txnId);
    res.json(txn);
  } catch (error) {
    next(error);
  }
}

async function eliminateICTransactions(req, res, next) {
  try {
    const { period } = req.body;
    const result = await consolidationService.eliminateIntercompanyTransactions(period);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getICTransactions(req, res, next) {
  try {
    const { status, entity, limit, offset } = req.query;
    const result = await consolidationService.getIntercompanyTransactions({
      status, entity,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ── Consolidated Financials ───────────────────────────────────────────────────

async function getConsolidatedTrialBalance(req, res, next) {
  try {
    const { asOfDate } = req.query;
    const report = await consolidationService.getConsolidatedTrialBalance(asOfDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

async function getConsolidatedBalanceSheet(req, res, next) {
  try {
    const { asOfDate } = req.query;
    const report = await consolidationService.getConsolidatedBalanceSheet(asOfDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

async function getConsolidatedProfitAndLoss(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const report = await consolidationService.getConsolidatedProfitAndLoss(startDate, endDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

// ── Budget Management ─────────────────────────────────────────────────────────

async function createBudget(req, res, next) {
  try {
    const budget = await budgetService.createBudget(req.body);
    res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
}

async function approveBudget(req, res, next) {
  try {
    const { budgetId } = req.params;
    const { approvedBy } = req.body;
    const budget = await budgetService.approveBudget(budgetId, approvedBy);
    res.json(budget);
  } catch (error) {
    next(error);
  }
}

async function activateBudget(req, res, next) {
  try {
    const { budgetId } = req.params;
    const budget = await budgetService.activateBudget(budgetId);
    res.json(budget);
  } catch (error) {
    next(error);
  }
}

async function calculateVariance(req, res, next) {
  try {
    const { budgetId } = req.params;
    const { period, criticalThresholdPct, warningThresholdPct } = req.body;
    const report = await budgetService.calculateVariance(budgetId, period, {
      criticalThresholdPct, warningThresholdPct
    });
    res.json(report);
  } catch (error) {
    next(error);
  }
}

async function getVarianceHistory(req, res, next) {
  try {
    const { budgetId } = req.params;
    const { limit } = req.query;
    const history = await budgetService.getVarianceHistory(budgetId, {
      limit: limit ? parseInt(limit) : 100
    });
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

async function getBudgets(req, res, next) {
  try {
    const { fiscalYear, status, entity, limit, offset } = req.query;
    const result = await budgetService.getBudgets({
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      status, entity,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ── Line of Credit ────────────────────────────────────────────────────────────

async function createLOC(req, res, next) {
  try {
    const loc = await locService.createLineOfCredit(req.body);
    res.status(201).json(loc);
  } catch (error) {
    next(error);
  }
}

async function locDrawdown(req, res, next) {
  try {
    const { locId } = req.params;
    const drawdown = await locService.drawdown(locId, req.body);
    res.json(drawdown);
  } catch (error) {
    next(error);
  }
}

async function locRepay(req, res, next) {
  try {
    const { locId } = req.params;
    const repayment = await locService.repay(locId, req.body);
    res.json(repayment);
  } catch (error) {
    next(error);
  }
}

async function locAudit(req, res, next) {
  try {
    const { locId } = req.params;
    const audit = await locService.performAudit(locId, req.body);
    res.json(audit);
  } catch (error) {
    next(error);
  }
}

async function getLOCs(req, res, next) {
  try {
    const { entityId, status, entity, limit, offset } = req.query;
    const result = await locService.getLOCs({
      entityId, status, entity,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getLOCAudits(req, res, next) {
  try {
    const { locId } = req.params;
    const { limit, offset } = req.query;
    const audits = await locService.getLOCAudits(locId, {
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0
    });
    res.json({ audits });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createEntity,
  getEntities,
  createICTransaction,
  approveICTransaction,
  eliminateICTransactions,
  getICTransactions,
  getConsolidatedTrialBalance,
  getConsolidatedBalanceSheet,
  getConsolidatedProfitAndLoss,
  createBudget,
  approveBudget,
  activateBudget,
  calculateVariance,
  getVarianceHistory,
  getBudgets,
  createLOC,
  locDrawdown,
  locRepay,
  locAudit,
  getLOCs,
  getLOCAudits
};
