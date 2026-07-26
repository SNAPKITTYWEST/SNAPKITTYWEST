const prisma = require("../models/prisma");
const auditLogService = require("./audit-log");
const glService = require("./gl-service");

// ═══════════════════════════════════════════════════════════════════
// LINE OF CREDIT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

async function createLineOfCredit({ entityId, lenderName, lenderContact, creditLimitCents, interestRateBps, rateType, primeRateBps, maturityDate, originationDate, collateralType, collateralValueCents, covenants, entity }) {
  const accountNumber = `LOC-${Date.now().toString(36).toUpperCase()}`;

  const loc = await prisma.lineOfCredit.create({
    data: {
      accountNumber,
      entityId: entityId || null,
      lenderName,
      lenderContact: lenderContact || null,
      creditLimitCents: BigInt(creditLimitCents),
      availableCents: BigInt(creditLimitCents),
      usedCents: 0,
      interestRateBps,
      rateType: rateType || "FIXED",
      primeRateBps: primeRateBps || null,
      maturityDate: new Date(maturityDate),
      originationDate: originationDate ? new Date(originationDate) : new Date(),
      collateralType: collateralType || null,
      collateralValueCents: collateralValueCents ? BigInt(collateralValueCents) : null,
      status: "ACTIVE",
      covenants: covenants || [],
      entity: entity || "default"
    }
  });

  await auditLogService.pushActivity({
    category: "LOC_CREATED",
    text: `Line of credit ${accountNumber} established with ${lenderName}: ${(Number(creditLimitCents) / 100).toFixed(2)} limit at ${(interestRateBps / 100).toFixed(2)}%`,
    metadata: { locId: loc.id, accountNumber, lenderName, creditLimitCents: Number(creditLimitCents) }
  });

  return loc;
}

async function drawdown(locId, { amountCents, purpose, reference, entity }) {
  const loc = await prisma.lineOfCredit.findUnique({ where: { id: locId } });

  if (!loc) {
    const err = new Error("Line of credit not found");
    err.statusCode = 404;
    throw err;
  }

  if (loc.status !== "ACTIVE") {
    const err = new Error(`Cannot drawdown on LOC in status: ${loc.status}`);
    err.statusCode = 400;
    throw err;
  }

  const drawAmount = BigInt(amountCents);
  if (drawAmount > loc.availableCents) {
    const err = new Error(`Drawdown amount ${drawAmount} exceeds available ${loc.availableCents}`);
    err.statusCode = 400;
    throw err;
  }

  const drawdown = await prisma.lOCDrawdown.create({
    data: {
      locId,
      amountCents: drawAmount,
      drawDate: new Date(),
      purpose: purpose || null,
      reference: reference || null,
      entity: entity || loc.entity
    }
  });

  await prisma.lineOfCredit.update({
    where: { id: locId },
    data: {
      usedCents: loc.usedCents + drawAmount,
      availableCents: loc.availableCents - drawAmount
    }
  });

  await auditLogService.pushActivity({
    category: "LOC_DRAWDOWN",
    text: `Drawdown of ${(Number(drawAmount) / 100).toFixed(2)} from LOC ${loc.accountNumber}. Available: ${((loc.availableCents - drawAmount) / 100).toFixed(2)}`,
    metadata: { locId, amount: Number(drawAmount), purpose }
  });

  return drawdown;
}

async function repay(locId, { amountCents, principalCents, interestCents, reference, entity }) {
  const loc = await prisma.lineOfCredit.findUnique({ where: { id: locId } });

  if (!loc) {
    const err = new Error("Line of credit not found");
    err.statusCode = 404;
    throw err;
  }

  const repayAmount = BigInt(amountCents);
  const principal = BigInt(principalCents || amountCents);
  const interest = BigInt(interestCents || 0);

  const repayment = await prisma.lOCRepayment.create({
    data: {
      locId,
      amountCents: repayAmount,
      principalCents: principal,
      interestCents: interest,
      paymentDate: new Date(),
      reference: reference || null,
      entity: entity || loc.entity
    }
  });

  const newUsed = loc.usedCents - principal;
  const newAvailable = loc.availableCents + principal;
  const isPaidOff = newUsed <= 0n;

  await prisma.lineOfCredit.update({
    where: { id: locId },
    data: {
      usedCents: newUsed < 0n ? 0n : newUsed,
      availableCents: newAvailable > loc.creditLimitCents ? loc.creditLimitCents : newAvailable,
      status: isPaidOff ? "PAID_OFF" : loc.status
    }
  });

  await auditLogService.pushActivity({
    category: "LOC_REPAYMENT",
    text: `Repayment of ${(Number(repayAmount) / 100).toFixed(2)} on LOC ${loc.accountNumber} (Principal: ${(Number(principal) / 100).toFixed(2)}, Interest: ${(Number(interest) / 100).toFixed(2)})`,
    metadata: { locId, amount: Number(repayAmount), principal: Number(principal), interest: Number(interest) }
  });

  return repayment;
}

// ═══════════════════════════════════════════════════════════════════
// LOC AUDIT
// ═══════════════════════════════════════════════════════════════════

async function performAudit(locId, { auditType, auditorName, entity }) {
  const loc = await prisma.lineOfCredit.findUnique({ where: { id: locId } });

  if (!loc) {
    const err = new Error("Line of credit not found");
    err.statusCode = 404;
    throw err;
  }

  const findings = [];
  const covenantStatus = [];
  const collateralStatus = [];
  let overallStatus = "PASS";

  // Check covenants
  const covenants = loc.covenants || [];
  for (const covenant of covenants) {
    // In production, calculate actual from GL
    const actual = 0; // Placeholder
    const status = actual >= covenant.threshold ? "PASS" : "FAIL";

    covenantStatus.push({
      covenantType: covenant.type,
      threshold: covenant.threshold,
      actual,
      status,
      trend: "STABLE"
    });

    if (status === "FAIL") {
      overallStatus = "FAIL";
      findings.push({
        category: "COVENANT",
        severity: "CRITICAL",
        description: `Covenant ${covenant.type} breached: ${actual} < ${covenant.threshold}`,
        recommendation: "Review financial position and take corrective action"
      });
    }
  }

  // Check collateral
  if (loc.collateralType && loc.collateralValueCents) {
    const ltv = Number(loc.usedCents) / Number(loc.collateralValueCents);
    let status;
    if (ltv > 0.80) status = "INADEQUATE";
    else if (ltv > 0.70) status = "MARGINAL";
    else status = "ADEQUATE";

    collateralStatus.push({
      type: loc.collateralType,
      appraisedValueCents: Number(loc.collateralValueCents),
      ltvRatio: parseFloat(ltv.toFixed(4)),
      status
    });

    if (status === "INADEQUATE") {
      overallStatus = "FAIL";
      findings.push({
        category: "COLLATERAL",
        severity: "HIGH",
        description: `Collateral LTV ${(ltv * 100).toFixed(1)}% exceeds 80% threshold`,
        recommendation: "Request additional collateral or reduce credit line"
      });
    }
  }

  // Check maturity
  const daysToMaturity = Math.floor((new Date(loc.maturityDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysToMaturity < 90 && daysToMaturity > 0) {
    findings.push({
      category: "MATURITY",
      severity: "MEDIUM",
      description: `LOC matures in ${daysToMaturity} days`,
      recommendation: "Begin renewal discussions with lender"
    });
  } else if (daysToMaturity <= 0) {
    overallStatus = "FAIL";
    findings.push({
      category: "MATURITY",
      severity: "CRITICAL",
      description: "LOC has expired",
      recommendation: "Renew or payoff immediately"
    });
  }

  if (overallStatus !== "FAIL" && findings.length > 0) {
    overallStatus = "CONDITIONAL";
  }

  const audit = await prisma.lOCAudit.create({
    data: {
      locId,
      auditType: auditType || "COVENANT_CHECK",
      auditDate: new Date(),
      auditorName: auditorName || null,
      findings,
      overallStatus,
      covenantStatus,
      collateralStatus,
      remediationRequired: overallStatus === "FAIL",
      remediationDeadline: overallStatus === "FAIL" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      nextAuditDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      entity: entity || loc.entity
    }
  });

  await auditLogService.pushActivity({
    category: "LOC_AUDIT",
    text: `LOC ${loc.accountNumber} audit completed: ${overallStatus}. ${findings.length} finding(s).`,
    metadata: { locId, auditType, overallStatus, findingCount: findings.length }
  });

  return audit;
}

async function getLOCs({ entityId, status, entity, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (entityId) where.entityId = entityId;
  if (status) where.status = status;
  if (entity) where.entity = entity;

  const [locs, total] = await Promise.all([
    prisma.lineOfCredit.findMany({
      where,
      include: { drawdowns: true, repayments: true, audits: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    }),
    prisma.lineOfCredit.count({ where })
  ]);

  return { linesOfCredit: locs, total, limit, offset };
}

async function getLOCAudits(locId, { limit = 20, offset = 0 } = {}) {
  return prisma.lOCAudit.findMany({
    where: { locId },
    orderBy: { auditDate: "desc" },
    take: limit,
    skip: offset
  });
}

module.exports = {
  createLineOfCredit,
  drawdown,
  repay,
  performAudit,
  getLOCs,
  getLOCAudits
};
