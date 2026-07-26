const crypto = require("node:crypto");

const env = require("../config/env");
const auditLogService = require("../services/audit-log");
const ocService = require("../services/oc-service");
const { createQuickBooksAuthorizationUrl } = require("../config/quickbooks");

function cleanText(value) {
  return String(value ?? "").trim();
}

function createHttpError(message, statusCode = 400, details) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
}

async function getAuthUrl(req, res, next) {
  try {
    const state = String(req.query.state || crypto.randomUUID());
    const url = createQuickBooksAuthorizationUrl(state);

    res.json({
      state,
      url
    });
  } catch (error) {
    next(error);
  }
}

async function handleCallback(req, res) {
  res.status(501).json({
    error: "QuickBooks token exchange is not implemented yet."
  });
}

async function createInvoice(req, res, next) {
  try {
    await auditLogService.pushActivity({
      category: "FINANCE_REQUEST",
      text: "Invoice generation requested before QuickBooks invoice sync was implemented.",
      metadata: {
        dealId: req.body?.dealId || null
      }
    });

    res.status(501).json({
      error: "QuickBooks invoice creation is not implemented yet."
    });
  } catch (error) {
    next(error);
  }
}

async function syncCollectiveBalance(req, res, next) {
  const slug = cleanText(req.body?.slug || req.query?.slug || env.openCollective.slug);

  try {
    if (!slug) {
      throw createHttpError(
        "Open Collective slug is not configured. Set OC_COLLECTIVE_SLUG or send a slug in the request.",
        503
      );
    }

    const balance = await ocService.getCollectiveBalance(slug);
    const syncedAt = new Date().toISOString();

    await auditLogService.pushActivity({
      category: "COLLECTIVE_SYNC",
      text: `Synced Open Collective balance for ${balance.slug}.`,
      metadata: {
        slug: balance.slug,
        name: balance.name,
        balanceCents: balance.balanceCents,
        currency: balance.currency,
        syncedAt
      }
    });

    res.json({
      ...balance,
      syncedAt
    });
  } catch (error) {
    try {
      await auditLogService.pushActivity({
        category: "SYNC_WARNING",
        text: `Open Collective sync warning for ${slug || "unconfigured slug"}.`,
        metadata: {
          slug: slug || null,
          message: error.message
        }
      });
    } catch {
      // Ignore audit log failures here so the original sync error is preserved.
    }

    next(error);
  }
}

module.exports = {
  createInvoice,
  getAuthUrl,
  handleCallback,
  syncCollectiveBalance
};
