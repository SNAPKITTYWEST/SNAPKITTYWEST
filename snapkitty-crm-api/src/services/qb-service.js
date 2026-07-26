const env = require("../config/env");

/**
 * Bill Gates 2005 Note:
 * Interoperability is the name of the game. If we can't talk to QuickBooks,
 * we're just an island. But we must be a *self-sufficient* island.
 */

async function createCustomer(contact) {
  // Check if QuickBooks is configured
  if (!env.quickBooks.clientId || !env.quickBooks.accessToken) {
    console.warn(">>> [QB SERVICE] QuickBooks not configured. Operating in MOCK mode.");
    return {
      DisplayName: contact.name,
      CompanyName: contact.company,
      PrimaryEmailAddr: { Address: contact.email },
      Id: `MOCK-QB-${Date.now()}`,
    };
  }

  // Implementation for real node-quickbooks would go here.
  // For now, we framework the integration points.
  throw new Error("QuickBooks Real Sync not yet initialized in .env");
}

function extractCustomerSnapshot(qbCustomer) {
  return {
    id: qbCustomer.Id || qbCustomer.id,
    name: qbCustomer.DisplayName,
    company: qbCustomer.CompanyName,
  };
}

function toSyncWarning(error) {
  return {
    code: "QB_SYNC_ERROR",
    message: error.message,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  createCustomer,
  extractCustomerSnapshot,
  toSyncWarning,
};
