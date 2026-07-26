const prisma = require("../models/prisma");
const auditLogService = require("./audit-log");

const SEED_ACCOUNTS = [
  // ASSETS
  { code: "1000", name: "Cash - Operating", type: "ASSET", subType: "CASH", normalBalance: "DEBIT", isSystem: true },
  { code: "1010", name: "Cash - Savings", type: "ASSET", subType: "CASH", normalBalance: "DEBIT" },
  { code: "1020", name: "Petty Cash", type: "ASSET", subType: "CASH", normalBalance: "DEBIT" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET", subType: "RECEIVABLE", normalBalance: "DEBIT", isSystem: true },
  { code: "1200", name: "Prepaid Expenses", type: "ASSET", subType: "PREPAID", normalBalance: "DEBIT" },
  { code: "1300", name: "Inventory", type: "ASSET", subType: "INVENTORY", normalBalance: "DEBIT" },
  { code: "1500", name: "Fixed Assets - Equipment", type: "ASSET", subType: "FIXED_ASSET", normalBalance: "DEBIT" },
  { code: "1510", name: "Accumulated Depreciation", type: "ASSET", subType: "CONTRA_ASSET", normalBalance: "CREDIT" },

  // LIABILITIES
  { code: "2000", name: "Accounts Payable", type: "LIABILITY", subType: "PAYABLE", normalBalance: "CREDIT", isSystem: true },
  { code: "2100", name: "Accrued Expenses", type: "LIABILITY", subType: "ACCRUED", normalBalance: "CREDIT" },
  { code: "2200", name: "Sales Tax Payable", type: "LIABILITY", subType: "TAX", normalBalance: "CREDIT" },
  { code: "2300", name: "Income Tax Payable", type: "LIABILITY", subType: "TAX", normalBalance: "CREDIT" },
  { code: "2400", name: "Deferred Revenue", type: "LIABILITY", subType: "DEFERRED", normalBalance: "CREDIT" },

  // EQUITY
  { code: "3000", name: "Owner's Equity", type: "EQUITY", subType: "EQUITY", normalBalance: "CREDIT", isSystem: true },
  { code: "3100", name: "Retained Earnings", type: "EQUITY", subType: "RETAINED", normalBalance: "CREDIT", isSystem: true },
  { code: "3200", name: "Current Year Earnings", type: "EQUITY", subType: "CURRENT", normalBalance: "CREDIT" },

  // REVENUE
  { code: "4000", name: "Service Revenue", type: "REVENUE", subType: "SERVICE", normalBalance: "CREDIT" },
  { code: "4100", name: "Product Revenue", type: "REVENUE", subType: "PRODUCT", normalBalance: "CREDIT" },
  { code: "4200", name: "Subscription Revenue", type: "REVENUE", subType: "SUBSCRIPTION", normalBalance: "CREDIT" },
  { code: "4300", name: "Interest Income", type: "REVENUE", subType: "INTEREST", normalBalance: "CREDIT" },
  { code: "4400", name: "Other Income", type: "REVENUE", subType: "OTHER", normalBalance: "CREDIT" },

  // EXPENSES
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", subType: "COGS", normalBalance: "DEBIT" },
  { code: "5100", name: "Salaries & Wages", type: "EXPENSE", subType: "PAYROLL", normalBalance: "DEBIT" },
  { code: "5200", name: "Payroll Taxes", type: "EXPENSE", subType: "PAYROLL", normalBalance: "DEBIT" },
  { code: "5300", name: "Rent", type: "EXPENSE", subType: "OCCUPANCY", normalBalance: "DEBIT" },
  { code: "5400", name: "Utilities", type: "EXPENSE", subType: "OCCUPANCY", normalBalance: "DEBIT" },
  { code: "5500", name: "Office Supplies", type: "EXPENSE", subType: "SUPPLIES", normalBalance: "DEBIT" },
  { code: "5600", name: "Professional Services", type: "EXPENSE", subType: "SERVICES", normalBalance: "DEBIT" },
  { code: "5700", name: "Marketing & Advertising", type: "EXPENSE", subType: "MARKETING", normalBalance: "DEBIT" },
  { code: "5800", name: "Insurance", type: "EXPENSE", subType: "INSURANCE", normalBalance: "DEBIT" },
  { code: "5900", name: "Depreciation Expense", type: "EXPENSE", subType: "DEPRECIATION", normalBalance: "DEBIT" },
  { code: "6000", name: "Interest Expense", type: "EXPENSE", subType: "INTEREST", normalBalance: "DEBIT" },
  { code: "6100", name: "Bank Fees", type: "EXPENSE", subType: "BANK", normalBalance: "DEBIT" },
  { code: "6200", name: "Bad Debt Expense", type: "EXPENSE", subType: "BAD_DEBT", normalBalance: "DEBIT" },
];

async function seedChartOfAccounts(entity = "default") {
  const results = { created: 0, skipped: 0 };

  for (const acct of SEED_ACCOUNTS) {
    const existing = await prisma.account.findUnique({ where: { code: acct.code } });
    if (existing) {
      results.skipped++;
      continue;
    }

    await prisma.account.create({
      data: { ...acct, entity }
    });
    results.created++;
  }

  await auditLogService.pushActivity({
    category: "GL_SETUP",
    text: `Chart of accounts seeded: ${results.created} created, ${results.skipped} skipped.`,
    metadata: results
  });

  return results;
}

async function getChartOfAccounts(entity = "default") {
  return prisma.account.findMany({
    where: { entity, isActive: true },
    orderBy: { code: "asc" },
    include: { parent: true, children: true }
  });
}

async function getAccountByCode(code) {
  return prisma.account.findUnique({ where: { code } });
}

async function getAccountBalance(accountId, startDate, endDate) {
  const where = {
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
  };

  const lines = await prisma.journalLine.findMany({ where });

  let debitTotal = 0n;
  let creditTotal = 0n;

  for (const line of lines) {
    debitTotal += line.debitCents;
    creditTotal += line.creditCents;
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  const normalIsDebit = account.normalBalance === "DEBIT";

  const balance = normalIsDebit
    ? Number(debitTotal - creditTotal)
    : Number(creditTotal - debitTotal);

  return {
    accountId,
    code: account.code,
    name: account.name,
    debitTotal: Number(debitTotal),
    creditTotal: Number(creditTotal),
    balance,
    normalBalance: account.normalBalance
  };
}

async function getTrialBalance(entity = "default", asOfDate) {
  const accounts = await prisma.account.findMany({
    where: { entity, isActive: true },
    orderBy: { code: "asc" }
  });

  const trialBalance = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const acct of accounts) {
    const bal = await getAccountBalance(acct.id, null, asOfDate);
    if (bal.debitTotal === 0 && bal.creditTotal === 0) continue;

    trialBalance.push({
      code: acct.code,
      name: acct.name,
      type: acct.type,
      debit: bal.debitTotal,
      credit: bal.creditTotal,
      balance: bal.balance
    });

    totalDebits += bal.debitTotal;
    totalCredits += bal.creditTotal;
  }

  return {
    accounts: trialBalance,
    totalDebits,
    totalCredits,
    isBalanced: totalDebits === totalCredits,
    asOfDate: asOfDate || new Date().toISOString()
  };
}

async function getBalanceSheet(entity = "default", asOfDate) {
  const accounts = await prisma.account.findMany({
    where: { entity, isActive: true, type: { in: ["ASSET", "LIABILITY", "EQUITY"] } },
    orderBy: { code: "asc" }
  });

  const assets = [];
  const liabilities = [];
  const equity = [];
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const acct of accounts) {
    const bal = await getAccountBalance(acct.id, null, asOfDate);
    const item = { code: acct.code, name: acct.name, balance: bal.balance };

    switch (acct.type) {
      case "ASSET":
        assets.push(item);
        totalAssets += bal.balance;
        break;
      case "LIABILITY":
        liabilities.push(item);
        totalLiabilities += bal.balance;
        break;
      case "EQUITY":
        equity.push(item);
        totalEquity += bal.balance;
        break;
    }
  }

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced: totalAssets === (totalLiabilities + totalEquity),
    asOfDate: asOfDate || new Date().toISOString()
  };
}

async function getProfitAndLoss(entity = "default", startDate, endDate) {
  const where = {
    entity,
    isActive: true,
    type: { in: ["REVENUE", "EXPENSE"] }
  };

  const accounts = await prisma.account.findMany({
    where,
    orderBy: { code: "asc" }
  });

  const revenue = [];
  const expenses = [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const acct of accounts) {
    const bal = await getAccountBalance(acct.id, startDate, endDate);
    if (bal.debitTotal === 0 && bal.creditTotal === 0) continue;

    const item = { code: acct.code, name: acct.name, balance: bal.balance };

    if (acct.type === "REVENUE") {
      revenue.push(item);
      totalRevenue += bal.balance;
    } else {
      expenses.push(item);
      totalExpenses += bal.balance;
    }
  }

  const netIncome = totalRevenue - totalExpenses;

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome,
    startDate: startDate || null,
    endDate: endDate || new Date().toISOString()
  };
}

async function getARAging(entity = "default") {
  const invoices = await prisma.customerInvoice.findMany({
    where: { entity, status: { in: ["SENT", "OVERDUE"] } },
    include: { contact: true }
  });

  const now = new Date();
  const aging = { current: [], days_30: [], days_60: [], days_90: [], days_120_plus: [] };
  const totals = { current: 0, days_30: 0, days_60: 0, days_90: 0, days_120_plus: 0 };

  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    const remaining = Number(inv.totalCents) - Number(inv.paidAmountCents || 0n);

    const item = {
      invoiceNumber: inv.invoiceNumber,
      contactName: inv.contact?.name || "Unknown",
      totalCents: Number(inv.totalCents),
      paidCents: Number(inv.paidAmountCents || 0n),
      remaining,
      dueDate: inv.dueDate,
      daysOverdue: Math.max(0, daysOverdue)
    };

    if (daysOverdue <= 0) {
      aging.current.push(item);
      totals.current += remaining;
    } else if (daysOverdue <= 30) {
      aging.days_30.push(item);
      totals.days_30 += remaining;
    } else if (daysOverdue <= 60) {
      aging.days_60.push(item);
      totals.days_60 += remaining;
    } else if (daysOverdue <= 90) {
      aging.days_90.push(item);
      totals.days_90 += remaining;
    } else {
      aging.days_120_plus.push(item);
      totals.days_120_plus += remaining;
    }
  }

  return { aging, totals, asOfDate: now.toISOString() };
}

async function getAPAging(entity = "default") {
  const bills = await prisma.vendorBill.findMany({
    where: { entity, status: { in: ["APPROVED", "OVERDUE"] } },
    include: { vendor: true }
  });

  const now = new Date();
  const aging = { current: [], days_30: [], days_60: [], days_90: [], days_120_plus: [] };
  const totals = { current: 0, days_30: 0, days_60: 0, days_90: 0, days_120_plus: 0 };

  for (const bill of bills) {
    const dueDate = new Date(bill.dueDate);
    const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    const remaining = Number(bill.totalCents) - Number(bill.paidAmountCents || 0n);

    const item = {
      billNumber: bill.billNumber,
      vendorName: bill.vendor?.name || "Unknown",
      totalCents: Number(bill.totalCents),
      paidCents: Number(bill.paidAmountCents || 0n),
      remaining,
      dueDate: bill.dueDate,
      daysOverdue: Math.max(0, daysOverdue)
    };

    if (daysOverdue <= 0) {
      aging.current.push(item);
      totals.current += remaining;
    } else if (daysOverdue <= 30) {
      aging.days_30.push(item);
      totals.days_30 += remaining;
    } else if (daysOverdue <= 60) {
      aging.days_60.push(item);
      totals.days_60 += remaining;
    } else if (daysOverdue <= 90) {
      aging.days_90.push(item);
      totals.days_90 += remaining;
    } else {
      aging.days_120_plus.push(item);
      totals.days_120_plus += remaining;
    }
  }

  return { aging, totals, asOfDate: now.toISOString() };
}

module.exports = {
  seedChartOfAccounts,
  getChartOfAccounts,
  getAccountByCode,
  getAccountBalance,
  getTrialBalance,
  getBalanceSheet,
  getProfitAndLoss,
  getARAging,
  getAPAging,
  SEED_ACCOUNTS
};
