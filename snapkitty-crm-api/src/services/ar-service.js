const prisma = require("../models/prisma");
const auditLogService = require("./audit-log");
const journalService = require("./journal-service");
const glService = require("./gl-service");

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const last = await prisma.customerInvoice.findFirst({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
    orderBy: { invoiceNumber: "desc" }
  });

  if (!last) return `INV-${year}-00001`;
  const seq = parseInt(last.invoiceNumber.split("-")[2], 10) + 1;
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

async function createCustomerInvoice({ contactId, amountCents, taxCents, dueDate, contractId, description, entity }) {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) {
    const err = new Error("Contact not found");
    err.statusCode = 404;
    throw err;
  }

  const invoiceNumber = await generateInvoiceNumber();
  const totalCents = BigInt(amountCents) + BigInt(taxCents || 0);

  const invoice = await prisma.customerInvoice.create({
    data: {
      invoiceNumber,
      contactId,
      amountCents: BigInt(amountCents),
      taxCents: BigInt(taxCents || 0),
      totalCents,
      dueDate: new Date(dueDate),
      status: "DRAFT",
      contractId: contractId || null,
      entity: entity || "default"
    },
    include: { contact: true }
  });

  await auditLogService.pushActivity({
    category: "AR_INVOICE",
    text: `Customer invoice ${invoiceNumber} created for ${contact.name}: ${(Number(totalCents) / 100).toFixed(2)}`,
    metadata: { invoiceNumber, contactId, totalCents: Number(totalCents) }
  });

  return invoice;
}

async function sendCustomerInvoice(invoiceId) {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id: invoiceId },
    include: { contact: true }
  });

  if (!invoice) {
    const err = new Error("Invoice not found");
    err.statusCode = 404;
    throw err;
  }

  if (invoice.status !== "DRAFT") {
    const err = new Error(`Cannot send invoice in status: ${invoice.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Create AR journal entry: debit AR, credit Revenue
  const arAccount = await glService.getAccountByCode("1100");
  const revenueAccount = await glService.getAccountByCode("4000"); // Default to Service Revenue

  if (!arAccount || !revenueAccount) {
    const err = new Error("Chart of accounts not initialized. Run seed first.");
    err.statusCode = 500;
    throw err;
  }

  const je = await journalService.createJournalEntry({
    date: new Date(),
    description: `AR Entry: ${invoice.invoiceNumber} - ${invoice.contact.name}`,
    reference: invoice.invoiceNumber,
    source: "AR",
    entity: invoice.entity,
    lines: [
      { accountId: arAccount.id, debitCents: Number(invoice.totalCents), description: invoice.contact.name, contactId: invoice.contactId },
      { accountId: revenueAccount.id, creditCents: Number(invoice.totalCents), description: invoice.contact.name }
    ]
  });

  await journalService.postJournalEntry(je.id);

  const updated = await prisma.customerInvoice.update({
    where: { id: invoiceId },
    data: { status: "SENT", journalEntryId: je.id }
  });

  await auditLogService.pushActivity({
    category: "AR_INVOICE",
    text: `Invoice ${invoice.invoiceNumber} sent to ${invoice.contact.name}. JE ${je.entryNumber} posted.`,
    metadata: { invoiceNumber: invoice.invoiceNumber, entryNumber: je.entryNumber }
  });

  return updated;
}

async function receiveCustomerPayment(invoiceId, { amountCents, method, reference: payRef, entity }) {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id: invoiceId },
    include: { contact: true }
  });

  if (!invoice) {
    const err = new Error("Invoice not found");
    err.statusCode = 404;
    throw err;
  }

  if (!["SENT", "OVERDUE"].includes(invoice.status)) {
    const err = new Error(`Cannot receive payment on invoice in status: ${invoice.status}`);
    err.statusCode = 400;
    throw err;
  }

  const payAmount = BigInt(amountCents);
  const remaining = invoice.totalCents - (invoice.paidAmountCents || 0n);

  if (payAmount > remaining) {
    const err = new Error(`Payment amount ${payAmount} exceeds remaining balance ${remaining}`);
    err.statusCode = 400;
    throw err;
  }

  // Create payment JE: debit Cash, credit AR
  const cashAccount = await glService.getAccountByCode("1000");
  const arAccount = await glService.getAccountByCode("1100");

  const je = await journalService.createJournalEntry({
    date: new Date(),
    description: `AR Payment: ${invoice.invoiceNumber} from ${invoice.contact.name}`,
    reference: payRef || invoice.invoiceNumber,
    source: "AR",
    entity: entity || invoice.entity,
    lines: [
      { accountId: cashAccount.id, debitCents: Number(payAmount), description: `Payment from ${invoice.contact.name}` },
      { accountId: arAccount.id, creditCents: Number(payAmount), description: invoice.contact.name, contactId: invoice.contactId }
    ]
  });

  await journalService.postJournalEntry(je.id);

  const newPaidAmount = (invoice.paidAmountCents || 0n) + payAmount;
  const isFullyPaid = newPaidAmount >= invoice.totalCents;

  const payment = await prisma.customerPayment.create({
    data: {
      paymentNumber: `RCV-${invoice.invoiceNumber}`,
      contactId: invoice.contactId,
      invoiceId: invoice.id,
      amountCents: payAmount,
      method: method || "CHECK",
      reference: payRef || null,
      journalEntryId: je.id,
      entity: entity || invoice.entity
    }
  });

  await prisma.customerInvoice.update({
    where: { id: invoiceId },
    data: {
      paidAmountCents: newPaidAmount,
      status: isFullyPaid ? "PAID" : invoice.status,
      paidAt: isFullyPaid ? new Date() : null,
      paymentRef: payRef || null
    }
  });

  await auditLogService.pushActivity({
    category: "AR_PAYMENT",
    text: `Payment of ${(Number(payAmount) / 100).toFixed(2)} received on ${invoice.invoiceNumber} from ${invoice.contact.name}.`,
    metadata: { invoiceNumber: invoice.invoiceNumber, amount: Number(payAmount), method: method || "CHECK" }
  });

  return payment;
}

async function createCreditMemo(invoiceId, { amountCents, reason, entity }) {
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id: invoiceId },
    include: { contact: true }
  });

  if (!invoice) {
    const err = new Error("Invoice not found");
    err.statusCode = 404;
    throw err;
  }

  const creditAmount = BigInt(amountCents);

  // Create credit JE: debit Revenue, credit AR
  const arAccount = await glService.getAccountByCode("1100");
  const revenueAccount = await glService.getAccountByCode("4000");

  const je = await journalService.createJournalEntry({
    date: new Date(),
    description: `Credit Memo: ${invoice.invoiceNumber} - ${reason || "Adjustment"}`,
    reference: invoice.invoiceNumber,
    source: "AR",
    entity: entity || invoice.entity,
    lines: [
      { accountId: revenueAccount.id, debitCents: Number(creditAmount), description: `Credit: ${reason || "Adjustment"}` },
      { accountId: arAccount.id, creditCents: Number(creditAmount), description: invoice.contact.name, contactId: invoice.contactId }
    ]
  });

  await journalService.postJournalEntry(je.id);

  const newCreditMemo = (invoice.creditMemoCents || 0n) + creditAmount;

  const updated = await prisma.customerInvoice.update({
    where: { id: invoiceId },
    data: {
      creditMemoCents: newCreditMemo,
      status: newCreditMemo >= invoice.totalCents ? "CREDITED" : invoice.status
    }
  });

  await auditLogService.pushActivity({
    category: "AR_CREDIT",
    text: `Credit memo of ${(Number(creditAmount) / 100).toFixed(2)} applied to ${invoice.invoiceNumber}.`,
    metadata: { invoiceNumber: invoice.invoiceNumber, amount: Number(creditAmount), reason }
  });

  return updated;
}

async function getCustomerInvoices({ contactId, status, entity, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (contactId) where.contactId = contactId;
  if (status) where.status = status;
  if (entity) where.entity = entity;

  const [invoices, total] = await Promise.all([
    prisma.customerInvoice.findMany({
      where,
      include: { contact: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.customerInvoice.count({ where })
  ]);

  return { invoices, total, limit, offset };
}

async function getOverdueInvoices(entity) {
  const now = new Date();
  return prisma.customerInvoice.findMany({
    where: {
      entity: entity || "default",
      status: { in: ["SENT", "OVERDUE"] },
      dueDate: { lt: now }
    },
    include: { contact: true },
    orderBy: { dueDate: "asc" }
  });
}

module.exports = {
  createCustomerInvoice,
  sendCustomerInvoice,
  receiveCustomerPayment,
  createCreditMemo,
  getCustomerInvoices,
  getOverdueInvoices,
  generateInvoiceNumber
};
