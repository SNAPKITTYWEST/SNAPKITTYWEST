const express = require("express");
const tier2 = require("../controllers/tier2-controller");

const router = express.Router();

// ── Entity Management ─────────────────────────────────────────────────────────

router.post("/entities", tier2.createEntity);
router.get("/entities", tier2.getEntities);

// ── Intercompany Transactions ─────────────────────────────────────────────────

router.post("/ic-transactions", tier2.createICTransaction);
router.get("/ic-transactions", tier2.getICTransactions);
router.post("/ic-transactions/:txnId/approve", tier2.approveICTransaction);
router.post("/ic-transactions/eliminate", tier2.eliminateICTransactions);

// ── Consolidated Financials ───────────────────────────────────────────────────

router.get("/consolidated/trial-balance", tier2.getConsolidatedTrialBalance);
router.get("/consolidated/balance-sheet", tier2.getConsolidatedBalanceSheet);
router.get("/consolidated/profit-and-loss", tier2.getConsolidatedProfitAndLoss);

// ── Budget Management ─────────────────────────────────────────────────────────

router.post("/budgets", tier2.createBudget);
router.get("/budgets", tier2.getBudgets);
router.post("/budgets/:budgetId/approve", tier2.approveBudget);
router.post("/budgets/:budgetId/activate", tier2.activateBudget);
router.post("/budgets/:budgetId/variance", tier2.calculateVariance);
router.get("/budgets/:budgetId/variance-history", tier2.getVarianceHistory);

// ── Line of Credit ────────────────────────────────────────────────────────────

router.post("/loc", tier2.createLOC);
router.get("/loc", tier2.getLOCs);
router.post("/loc/:locId/drawdown", tier2.locDrawdown);
router.post("/loc/:locId/repay", tier2.locRepay);
router.post("/loc/:locId/audit", tier2.locAudit);
router.get("/loc/:locId/audits", tier2.getLOCAudits);

module.exports = router;
