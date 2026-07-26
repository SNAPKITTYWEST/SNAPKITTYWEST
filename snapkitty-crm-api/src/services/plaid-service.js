const { Configuration, PlaidApi, PlaidEnvironments, PlaidApiApi } = require("plaid");
const env = require("../config/env");
const auditLogService = require("./audit-log");

/**
 * Bill Gates 2005 Note:
 * Real-time data is the currency of the future.
 * Plaid is our window into the global banking infrastructure.
 * 
 * TRANSACTION HARVESTER - BigInt Precision
 */

let plaidClient = null;

function getPlaidClient() {
  if (plaidClient) return plaidClient;
  
  if (!env.plaid.clientId) {
    console.warn(">>> [PLAID] Client ID missing.returning null client.");
    return null;
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env.plaid.env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": env.plaid.clientId,
        "PLAID-SECRET": env.plaid.secret,
      },
    },
  });

  plaidClient = new PlaidApi(configuration);
  return plaidClient;
}

async function createLinkToken(userId) {
  const client = getPlaidClient();
  
  if (!client) {
    return { link_token: "mock_link_token_" + Date.now() };
  }

  const response = await client.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "SnapKitty Sovereign OS",
    products: ["auth", "transactions"],
    country_codes: ["US"],
    language: "en",
  });

  return response.data;
}

async function exchangePublicToken(publicToken) {
  const client = getPlaidClient();
  
  if (!client) {
    return {
      access_token: "mock_access_token_bank_" + Date.now(),
      item_id: "mock_item_id"
    };
  }

  const response = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return response.data;
}

async function getTransactions(accessToken, cursor = "") {
  const client = getPlaidClient();
  
  if (!client) {
    return {
      accounts: [],
      transactions: [],
      total_transactions: 0,
      next_cursor: ""
    };
  }

  const response = await client.transactionsSync({
    access_token: accessToken,
    cursor: cursor,
  });

  return response.data;
}

function toBigIntCents(amount) {
  return BigInt(Math.round(amount * 100));
}

async function harvestTransactions(accessToken) {
  const transactions = await getTransactions(accessToken);
  
  if (!transactions.transactions || transactions.transactions.length === 0) {
    return { harvested: 0, reports: 0, lcr: 0 };
  }

  let harvestedCount = 0;
  let reportTriggerCount = 0;
  let totalLiquid = BigInt(0);
  let totalPipeline = BigInt(0);

  for (const tx of transactions.transactions) {
    const amountCents = toBigIntCents(Math.abs(tx.amount));
    const isIncome = tx.amount < 0;
    
    harvestedCount++;

    if (isIncome) {
      totalLiquid += amountCents;
    } else {
      totalPipeline += amountCents;
    }

    if (toBigIntCents(Math.abs(tx.amount)) >= toBigIntCents(10000)) {
      reportTriggerCount++;
      
      try {
        await auditLogService.pushActivity({
          category: "TRADELINE_REPORTED",
          text: `Large transaction detected: $${tx.amount} (${tx.name})`,
          metadata: {
            transactionId: tx.transaction_id,
            amount: tx.amount,
            date: tx.date,
            merchant: tx.merchant_name,
            category: tx.category
          }
        });
      } catch (e) {
        console.error("Failed to log tradeline report:", e.message);
      }
    }
  }

  const lcrRatio = totalPipeline === BigInt(0) 
    ? BigInt(0) 
    : totalLiquid / totalPipeline;

  return {
    harvested: harvestedCount,
    reports: reportTriggerCount,
    lcr: Number(lcrRatio),
    totalLiquidCents: totalLiquid.toString(),
    totalPipelineCents: totalPipeline.toString()
  };
}

async function getAccountBalances(accessToken) {
  const client = getPlaidClient();
  
  if (!client) {
    return {
      accounts: [
        { account_id: "mock_1", name: "Checking", balances: { current: 12500.00, available: 12500.00 } },
        { account_id: "mock_2", name: "Savings", balances: { current: 50000.00, available: 50000.00 } }
      ]
    };
  }

  const response = await client.accountsBalanceGet({
    access_token: accessToken,
  });

  return response.data;
}

function calculateLCR(liquidCents, pipelineLiabilityCents) {
  if (pipelineLiabilityCents === BigInt(0)) {
    return liquidCents > BigInt(0) ? BigInt(200) : BigInt(0);
  }
  
  const ratio = (liquidCents * BigInt(100)) / pipelineLiabilityCents;
  return ratio;
}

module.exports = {
  createLinkToken,
  exchangePublicToken,
  getTransactions,
  harvestTransactions,
  getAccountBalances,
  calculateLCR,
  toBigIntCents
};
