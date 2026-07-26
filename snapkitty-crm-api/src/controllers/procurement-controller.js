const prisma = require("../models/prisma");
const auditLogService = require("../services/audit-log");

/**
 * Bill Gates 2005 Perspective:
 * Procurement is the plumbing of the enterprise.
 * We make it invisible through automation.
 */

async function createPurchaseOrder(req, res, next) {
  try {
    const { vendorId, totalCents, costCenterId, poNumber } = req.body;

    if (!vendorId || !totalCents || !poNumber) {
      const err = new Error("Vendor, Amount, and PO Number are required for procurement execution.");
      err.statusCode = 400;
      throw err;
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId,
        totalCents: BigInt(totalCents),
        costCenterId,
        status: "DRAFT"
      }
    });

    await auditLogService.pushActivity({
      category: "PROCUREMENT_INITIATED",
      text: `Purchase Order ${poNumber} generated for Vendor ${vendorId}`,
      metadata: { poId: po.id }
    });

    res.status(201).json(po);
  } catch (error) {
    next(error);
  }
}

async function listVendors(req, res, next) {
  try {
    const vendors = await prisma.vendor.findMany({
      include: { _count: { select: { purchaseOrders: true } } }
    });
    res.json(vendors);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPurchaseOrder,
  listVendors
};
