const prisma = require("../models/prisma");
const auditLogService = require("./audit-log");
const journalService = require("./journal-service");
const glService = require("./gl-service");

async function generateBillNumber() {
  const year = new Date().getFullYear();
  const last = await prisma.vendorBill.findFirst({
    where: { billNumber: { startsWith: `BILL-${year}-` } },
    orderBy: { billNumber: "desc" }
  });

  if (!last) return `BILL-${year}-00001`;
  const seq = parseInt(last.billNumber.split("-")[2], 10) + 1;
  return `BILL-${year}-${String(seq).padStart(5, "0")}`;
}

async function createVendorBill({ vendorId, amountCents, taxCents, dueDate, poId, description, reference, entity }) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    const err = new Error("Vendor not found");
    err.statusCode = 404;
    throw err;
  }

  const billNumber = await generateBillNumber();
  const totalCents = BigInt(amountCents) + BigInt(taxCents || 0);

  const bill = await prisma.vendorBill.create({
    data: {
      billNumber,
      vendorId,
      amountCents: BigInt(amountCents),
      taxCents: BigInt(taxCents || 0),
      totalCents,
      dueDate: new Date(dueDate),
      status: "DRAFT",
      poId: poId || null,
      entity: entity || "default"
    },
    include: { vendor: true, purchaseOrder: true }
  });

  await auditLogService.pushActivity({
    category: "AP_BILL",
    text: `Vendor bill ${billNumber} created for ${vendor.name}: ${(Number(totalCents) / 100).toFixed(2)}`,
    metadata: { billNumber, vendorId, totalCents: Number(totalCents) }
  });

  return bill;
}

async function approveVendorBill(billId) {
  const bill = await prisma.vendorBill.findUnique({
    where: { id: billId },
    include: { vendor: true }
  });

  if (!bill) {
    const err = new Error("Bill not found");
    err.statusCode = 404;
    throw err;
  }

  if (bill.status !== "DRAFT") {
    const err = new Error(`Cannot approve bill in status: ${bill.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Create AP journal entry: debit Expense, credit AP
  const apAccount = await glService.getAccountByCode("2000");
  const expenseAccount = await glService.getAccountByCode("5600"); // Default to Professional Services

  if (!apAccount || !expenseAccount) {
    const err = new Error("Chart of accounts not initialized. Run seed first.");
    err.statusCode = 500;
    throw err;
  }

  const je = await journalService.createJournalEntry({
    date: new Date(),
    description: `AP Entry: ${bill.billNumber} - ${bill.vendor.name}`,
    reference: bill.billNumber,
    source: "AP",
    entity: bill.entity,
    lines: [
      { accountId: expenseAccount.id, debitCents: Number(bill.amountCents), description: bill.vendor.name },
      { accountId: apAccount.id, creditCents: Number(bill.totalCents), description: bill.vendor.name, contactId: null }
    ]
  });

  await journalService.postJournalEntry(je.id);

  const updated = await prisma.vendorBill.update({
    where: { id: billId },
    data: { status: "APPROVED", journalEntryId: je.id }
  });

  await auditLogService.pushActivity({
    category: "AP_BILL",
    text: `Vendor bill ${bill.billNumber} approved. JE ${je.entryNumber} posted.`,
    metadata: { billNumber: bill.billNumber, entryNumber: je.entryNumber }
  });

  return updated;
}

async function payVendorBill(billId, { amountCents, method, reference: payRef, entity }) {
  const bill = await prisma.vendorBill.findUnique({
    where: { id: billId },
    include: { vendor: true }
  });

  if (!bill) {
    const err = new Error("Bill not found");
    err.statusCode = 404;
    throw err;
  }

  if (!["APPROVED", "OVERDUE"].includes(bill.status)) {
    const err = new Error(`Cannot pay bill in status: ${bill.status}`);
    err.statusCode = 400;
    throw err;
  }

  const payAmount = BigInt(amountCents);
  const remaining = bill.totalCents - (bill.paidAmountCents || 0n);

  if (payAmount > remaining) {
    const err = new Error(`Payment amount ${payAmount} exceeds remaining balance ${remaining}`);
    err.statusCode = 400;
    throw err;
  }

  // Create payment JE: debit AP, credit Cash
  const apAccount = await glService.getAccountByCode("2000");
  const cashAccount = await glService.getAccountByCode("1000");

  const je = await journalService.createJournalEntry({
    date: new Date(),
    description: `AP Payment: ${bill.billNumber} to ${bill.vendor.name}`,
    reference: payRef || bill.billNumber,
    source: "AP",
    entity: entity || bill.entity,
    lines: [
      { accountId: apAccount.id, debitCents: Number(payAmount), description: bill.vendor.name },
      { accountId: cashAccount.id, creditCents: Number(payAmount), description: `Payment for ${bill.billNumber}` }
    ]
  });

  await journalService.postJournalEntry(je.id);

  const newPaidAmount = (bill.paidAmountCents || 0n) + payAmount;
  const isFullyPaid = newPaidAmount >= bill.totalCents;

  const payment = await prisma.vendorPayment.create({
    data: {
      paymentNumber: `PAY-${bill.billNumber}`,
      vendorId: bill.vendorId,
      billId: bill.id,
      amountCents: payAmount,
      method: method || "CHECK",
      reference: payRef || null,
      journalEntryId: je.id,
      entity: entity || bill.entity
    }
  });

  await prisma.vendorBill.update({
    where: { id: billId },
    data: {
      paidAmountCents: newPaidAmount,
      status: isFullyPaid ? "PAID" : bill.status,
      paidAt: isFullyPaid ? new Date() : null,
      paymentRef: payRef || null
    }
  });

  await auditLogService.pushActivity({
    category: "AP_PAYMENT",
    text: `Payment of ${(Number(payAmount) / 100).toFixed(2)} made on ${bill.billNumber} via ${method || "CHECK"}.`,
    metadata: { billNumber: bill.billNumber, amount: Number(payAmount), method: method || "CHECK" }
  });

  return payment;
}

async function getVendorBills({ vendorId, status, entity, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (vendorId) where.vendorId = vendorId;
  if (status) where.status = status;
  if (entity) where.entity = entity;

  const [bills, total] = await Promise.all([
    prisma.vendorBill.findMany({
      where,
      include: { vendor: true, purchaseOrder: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.vendorBill.count({ where })
  ]);

  return { bills, total, limit, offset };
}

module.exports = {
  createVendorBill,
  approveVendorBill,
  payVendorBill,
  getVendorBills,
  generateBillNumber
};
