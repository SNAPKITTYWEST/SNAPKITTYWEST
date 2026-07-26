const prisma = require("../models/prisma");
const auditLogService = require("../services/audit-log");

/**
 * Bill Gates 2005 Perspective:
 * Data without insight is just noise.
 * The Intelligence Hub provides the 'Business Pulse' for the Sovereign OS.
 */

async function getBusinessPulse(req, res, next) {
  try {
    // 1. Calculate Liquidity (Sum of all liquid assets in cents)
    // For now, we simulate the aggregation from segment ledgers
    const totalLiquidCents = 15420050n; // $154,200.50

    // 2. Calculate Total Pipeline (from Deals)
    const deals = await prisma.deal.findMany();
    const pipelineValueCents = deals.reduce((acc, deal) => acc + BigInt(deal.valueCents), 0n);

    // 3. Calculate Procurement Exposure (Open POs)
    const openPos = await prisma.purchaseOrder.findMany({ where: { status: "APPROVED" } });
    const exposureCents = openPos.reduce((acc, po) => acc + BigInt(po.totalCents), 0n);

    // 4. Calculate Sovereign Credit Score (SCS)
    // Formula: (Liquidity + (Pipeline * 0.2)) / (Exposure + 1) * Scaler
    const scs = Math.min(850, Math.floor(Number((totalLiquidCents + (pipelineValueCents / 5n)) / (exposureCents / 100n || 1n)) * 10));

    // 5. Burn Rate Analysis (Simplified)
    const monthlyBurnCents = 4500000n; // $45,000.00

    const snapshot = {
      timestamp: new Date().toISOString(),
      metrics: {
        scsScore: scs,
        liquidityCents: totalLiquidCents.toString(),
        pipelineValueCents: pipelineValueCents.toString(),
        exposureCents: exposureCents.toString(),
        runwayMonths: Number(totalLiquidCents / monthlyBurnCents)
      },
      alerts: scs < 600 ? ["CRITICAL_LIQUIDITY_WARNING"] : []
    };

    res.json(snapshot);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBusinessPulse
};
