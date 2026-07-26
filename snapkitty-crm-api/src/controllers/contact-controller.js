const prisma = require("../models/prisma");
const auditLogService = require("../services/audit-log");
const qbService = require("../services/qb-service");

const CONTACT_STATUS = {
  lead: "Lead",
  qualified: "Qualified",
  customer: "Customer"
};

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listContacts(req, res, next) {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json({ contacts });
  } catch (error) {
    next(error);
  }
}

async function createContact(req, res, next) {
  try {
    const { name, company, email, status } = req.body;

    if (!name || !company || !email) {
      throw createHttpError(400, "Name, Company, and Email are mandatory for Sovereign Registration.");
    }

    // Bill Gates 2005 Note: Check for duplicates before committing.
    // We don't want a fragmented address book.
    const existing = await prisma.contact.findUnique({ where: { email } });
    if (existing) {
      throw createHttpError(409, "This entity is already registered in the Sovereign Ledger.");
    }

    let contact = await prisma.contact.create({
      data: {
        name,
        company,
        email,
        status: CONTACT_STATUS[status?.toLowerCase()] || CONTACT_STATUS.lead
      }
    });

    // Bifrost Bridge: Attempt QuickBooks Sync
    let qbSyncStatus = "off";
    try {
      const qbCustomer = await qbService.createCustomer(contact);
      if (qbCustomer && qbCustomer.Id) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: { qbCustomerId: qbCustomer.Id }
        });
        qbSyncStatus = "synced";
      }
    } catch (err) {
      qbSyncStatus = "failed";
      console.error(">>> [BIFROST] QuickBooks Sync Failed:", err.message);
    }

    await auditLogService.pushActivity({
      category: "CONTACT_CREATED",
      text: `Entity Registered: ${contact.name} (${contact.company})`,
      metadata: { contactId: contact.id, qbSyncStatus }
    });

    res.status(201).json({ contact, qbSyncStatus });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listContacts,
  createContact
};
