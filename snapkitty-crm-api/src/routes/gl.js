const express = require("express");
const gl = require("../controllers/gl-controller");

const router = express.Router();

// ── Chart of Accounts ──────────────────────────────────────────────────────────

router.post("/accounts/seed", gl.seedAccounts);
router.get("/accounts", gl.getAccounts);
router.get("/accounts/:accountId/balance", gl.getAccountBalance);

// ── Journal Entries ────────────────────────────────────────────────────────────

router.post("/journal-entries", gl.createJournalEntry);
router.get("/journal-entries", gl.getJournalEntries);
router.post("/journal-entries/:entryId/post", gl.postJournalEntry);
router.post("/journal-entries/:entryId/reverse", gl.reverseJournalEntry);
router.post("/journal-entries/:entryId/void", gl.voidJournalEntry);

// ── Financial Reports ──────────────────────────────────────────────────────────

router.get("/reports/trial-balance", gl.getTrialBalance);
router.get("/reports/balance-sheet", gl.getBalanceSheet);
router.get("/reports/profit-and-loss", gl.getProfitAndLoss);
router.get("/reports/ar-aging", gl.getARAging);
router.get("/reports/ap-aging", gl.getAPAging);

// ── Accounts Payable ───────────────────────────────────────────────────────────

router.post("/ap/bills", gl.createBill);
router.get("/ap/bills", gl.getBills);
router.post("/ap/bills/:billId/approve", gl.approveBill);
router.post("/ap/bills/:billId/pay", gl.payBill);

// ── Accounts Receivable ────────────────────────────────────────────────────────

router.post("/ar/invoices", gl.createInvoice);
router.get("/ar/invoices", gl.getInvoices);
router.get("/ar/invoices/overdue", gl.getOverdueInvoices);
router.post("/ar/invoices/:invoiceId/send", gl.sendInvoice);
router.post("/ar/invoices/:invoiceId/pay", gl.receivePayment);
router.post("/ar/invoices/:invoiceId/credit", gl.creditMemo);

// ── Bank Reconciliation ────────────────────────────────────────────────────────

router.post("/bank-reconciliation", gl.createReconciliation);
router.get("/bank-reconciliation", gl.getReconciliations);
router.post("/bank-reconciliation/:reconciliationId/match", gl.matchTransaction);
router.post("/bank-reconciliation/:reconciliationId/complete", gl.completeReconciliation);

module.exports = router;
