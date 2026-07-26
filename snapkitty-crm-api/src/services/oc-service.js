const axios = require("axios");

const env = require("../config/env");

const OPEN_COLLECTIVE_API_URL = "https://api.opencollective.com/graphql/v2";
const COLLECTIVE_BALANCE_QUERY = `
  query CollectiveBalance($slug: String!) {
    account(slug: $slug) {
      id
      slug
      name
      stats {
        balance {
          value
          currency
        }
      }
    }
  }
`;

function createServiceError(message, statusCode = 502, details) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
}

function createHeaders() {
  const headers = {
    "Content-Type": "application/json"
  };

  if (env.openCollective.apiKey) {
    headers["Personal-Token"] = env.openCollective.apiKey;
  }

  return headers;
}

async function queryOpenCollective(query, variables = {}) {
  const response = await axios.post(
    OPEN_COLLECTIVE_API_URL,
    {
      query,
      variables
    },
    {
      headers: createHeaders()
    }
  );

  if (response.data?.errors?.length) {
    throw createServiceError(
      "Open Collective returned GraphQL errors.",
      502,
      response.data.errors
    );
  }

  return response.data?.data || null;
}

async function getCollectiveBalance(slug) {
  const data = await queryOpenCollective(COLLECTIVE_BALANCE_QUERY, { slug });
  const account = data?.account;

  if (!account) {
    throw createServiceError(`Open Collective account ${slug} was not found.`, 404);
  }

  const balanceValue = Number(account.stats?.balance?.value || 0);
  const currency = String(account.stats?.balance?.currency || "USD");

  return {
    id: account.id,
    slug: account.slug,
    name: account.name,
    currency,
    balanceValue,
    balanceCents: Math.round(balanceValue * 100)
  };
}

module.exports = {
  getCollectiveBalance,
  queryOpenCollective
};
