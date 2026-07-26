const glService = require("../services/gl-service");
const journalService = require("../services/journal-service");
const apService = require("../services/ap-service");
const arService = require("../services/ar-service");
const reconService = require("../services/recon-service");

// ── Chart of Accounts ──────────────────────────────────────────────────────────

async function seedAccounts(req, res, next) {
  try {
    const entity = req.query.entity || "default";
    const result = await glService.seedChartOfAccounts(entity);
    res.json({ status: "ok", ...result });
  } catch (error) {
    next(error);
  }
}

async function getAccounts(req, res, next) {
  try {
    const entity = req.query.entity || "default";
    const accounts = await glService.getChartOfAccounts(entity);
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
}

async function getAccountBalance(req, res, next) {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;
    const balance = await glService.getAccountBalance(accountId, startDate, endDate);
    res.json(balance);
  } catch (error) {
    next(error);
  }
}

// ── Journal Entries ────────────────────────────────────────────────────────────

async function createJournalEntry(req, res, next) {
  try {
    const entry = await journalService.createJournalEntry(req.body);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
}

async function postJournalEntry(req, res, next) {
  try {
    const { entryId } = req.params;
    const entry = await journalService.postJournalEntry(entryId);
    res.json(entry);
  } catch (error) {
    next(error);
  }
}

async function reverseJournalEntry(req, res, next) {
  try {
    const { entryId } = req.params;
    const { description } = req.body;
    const reversal = await journalService.reverseJournalEntry(entryId, description);
    res.json(reversal);
  } catch (error) {
    next(error);
  }
}

async function voidJournalEntry(req, res, next) {
  try {
    const { entryId } = req.params;
    const entry = await journalService.voidJournalEntry(entryId);
    res.json(entry);
  } catch (error) {
    next(error);
  }
}

async function getJournalEntries(req, res, next) {
  try {
    const { entity, status, startDate, endDate, source, limit, offset } = req.query;
    const result = await journalService.getJournalEntries({
      entity, status, startDate, endDate, source,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ── Financial Reports ──────────────────────────────────────────────────────────

async function getTrialBalance(req, res, next) {
  try {
    const { entity, asOfDate } = req.query;
    const report = await glService.getTrialBalance(entity, asOfDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

async function getBalanceSheet(req, res, next) {
  try {
    const { entity, asOfDate } = req.query;
    const report = await glService.getBalanceSheet(entity, asOfDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

async function getProfitAndLoss(req, res, next) {
  try {
    const { entity, startDate, endDate } = req.query;
    const report = await glService.getProfitAndLoss(entity, startDate, endDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

async function getARAging(req, res, next) {
  try {
    const { entity } = req.query;
    const report = await glService.getARAging(entity);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

async function getAPAging(req, res, next) {
  try {
    const { entity } = req.query;
    const report = await glService.getAPAging(entity);
    res.json(report);
  } catch (error) {
    next(error);
  }
}

// ── Accounts Payable ───────────────────────────────────────────────────────────

async function createBill(req, res, next) {
  try {
    const bill = await apService.createVendorBill(req.body);
    res.status(201).json(bill);
  } catch (error) {
    next(error);
  }
}

async function approveBill(req, res, next) {
  try {
    const { billId } = req.params;
    const bill = await apService.approveVendorBill(billId);
    res.json(bill);
  } catch (error) {
    next(error);
  }
}

async function payBill(req, res, next) {
  try {
    const { billId } = req.params;
    const payment = await apService.payVendorBill(billId, req.body);
    res.json(payment);
  } catch (error) {
    next(error);
  }
}

async function getBills(req, res, next) {
  try {
    const { vendorId, status, entity, limit, offset } = req.query;
    const result = await apService.getVendorBills({
      vendorId, status, entity,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ── Accounts Receivable ────────────────────────────────────────────────────────

async function createInvoice(req, res, next) {
  try {
    const invoice = await arService.createCustomerInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
}

async function sendInvoice(req, res, next) {
  try {
    const { invoiceId } = req.params;
    const invoice = await arService.sendCustomerInvoice(invoiceId);
    res.json(invoice);
  } catch (error) {
    next(error);
  }
}

async function receivePayment(req, res, next) {
  try {
    const { invoiceId } = req.params;
    const payment = await arService.receiveCustomerPayment(invoiceId, req.body);
    res.json(payment);
  } catch (error) {
    next(error);
  }
}

async function creditMemo(req, res, next) {
  try {
    const { invoiceId } = req.params;
    const result = await arService.createCreditMemo(invoiceId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getInvoices(req, res, next) {
  try {
    const { contactId, status, entity, limit, offset } = req.query;
    const result = await arService.getCustomerInvoices({
      contactId, status, entity,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getOverdueInvoices(req, res, next) {
  try {
    const { entity } = req.query;
    const invoices = await arService.getOverdueInvoices(entity);
    res.json({ invoices });
  } catch (error) {
    next(error);
  }
}

// ── Bank Reconciliation ────────────────────────────────────────────────────────

async function createReconciliation(req, res, next) {
  try {
    const recon = await reconService.createReconciliation(req.body);
    res.status(201).json(recon);
  } catch (error) {
    next(error);
  }
}

async function matchTransaction(req, res, next) {
  try {
    const { reconciliationId } = req.params;
    const result = await reconService.matchTransaction(reconciliationId, req.body.plaidTxnId, req.body.journalLineId, req.body.amountCents);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function completeReconciliation(req, res, next) {
  try {
    const { reconciliationId } = req.params;
    const { reconciledBy } = req.body;
    const result = await reconService.completeReconciliation(reconciliationId, reconciledBy);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getReconciliations(req, res, next) {
  try {
    const { accountId, status, entity, limit, offset } = req.query;
    const result = await reconService.getReconciliations({
      accountId, status, entity,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  seedAccounts,
  getAccounts,
  getAccountBalance,
  createJournalEntry,
  postJournalEntry,
  reverseJournalEntry,
  voidJournalEntry,
  getJournalEntries,
  getTrialBalance,
  getBalanceSheet,
  getProfitAndLoss,
  getARAging,
  getAPAging,
  createBill,
  approveBill,
  payBill,
  getBills,
  createInvoice,
  sendInvoice,
  receivePayment,
  creditMemo,
  getInvoices,
  getOverdueInvoices,
  createReconciliation,
  matchTransaction,
  completeReconciliation,
  getReconciliations
};
