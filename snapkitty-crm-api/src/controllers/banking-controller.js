const plaidService = require("../services/plaid-service");
const auditLogService = require("../services/audit-log");

/**
 * Bill Gates 2005 Note:
 * The bridge between the bank and the ledger must be unbreakable.
 * We use Plaid to automate the reconciliation process.
 */

async function getLinkToken(req, res, next) {
  try {
    const userId = req.headers["x-user-id"] || "sovereign_admin";
    const tokenData = await plaidService.createLinkToken(userId);
    res.json(tokenData);
  } catch (error) {
    next(error);
  }
}

async function handlePublicTokenExchange(req, res, next) {
  try {
    const { publicToken } = req.body;
    if (!publicToken) {
      const err = new Error("publicToken is required for bank synchronization.");
      err.statusCode = 400;
      throw err;
    }

    const exchangeData = await plaidService.exchangePublicToken(publicToken);

    await auditLogService.pushActivity({
      category: "BANK_CONNECTED",
      text: `Banking Synapse Established. Item ID: ${exchangeData.item_id}`,
      metadata: { itemId: exchangeData.item_id }
    });

    res.json({
      status: "connected",
      message: "Banking Synapse Active. Canonical Ledger update scheduled."
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLinkToken,
  handlePublicTokenExchange,
};
