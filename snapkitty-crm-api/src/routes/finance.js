const express = require("express");
const bankingController = require("../controllers/banking-controller");

const router = express.Router();

/**
 * Bill Gates 2005 Note:
 * The finance routes are the most sensitive part of the system.
 * We keep banking (Plaid) and local ledger logic strictly separated.
 */

// Plaid Banking Synapse
router.get("/plaid/link-token", bankingController.getLinkToken);
router.post("/plaid/exchange-token", bankingController.handlePublicTokenExchange);

// Bifrost Multi-Entity Sync (Placeholder for expanded logic)
router.post("/bifrost/sync", (req, res) => {
  res.json({
    status: "synced",
    timestamp: new Date().toISOString(),
    scs: 780
  });
});

module.exports = router;
