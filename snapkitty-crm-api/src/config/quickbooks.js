const QuickBooks = require("node-quickbooks");

const env = require("./env");

const QUICKBOOKS_SCOPE = "com.intuit.quickbooks.accounting";

function createConfigError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function resolveQuickBooksConfig(overrides = {}) {
  return {
    ...env.quickBooks,
    ...overrides,
    useSandbox: (overrides.environment || env.quickBooks.environment) !== "production"
  };
}

function assertQuickBooksRuntimeConfig(config) {
  const missing = [];

  if (!config.clientId) {
    missing.push("QB_CLIENT_ID");
  }

  if (!config.clientSecret) {
    missing.push("QB_CLIENT_SECRET");
  }

  if (!config.accessToken) {
    missing.push("QB_ACCESS_TOKEN");
  }

  if (!config.realmId) {
    missing.push("QB_REALM_ID");
  }

  if (missing.length > 0) {
    throw createConfigError(
      `QuickBooks runtime credentials are missing: ${missing.join(", ")}.`,
      503
    );
  }
}

function createQuickBooksClient(overrides = {}) {
  const config = resolveQuickBooksConfig(overrides);
  assertQuickBooksRuntimeConfig(config);

  return new QuickBooks(
    config.clientId,
    config.clientSecret,
    config.accessToken,
    false,
    config.realmId,
    config.useSandbox,
    config.debug,
    config.minorVersion,
    "2.0",
    config.refreshToken || undefined
  );
}

function createQuickBooksAuthorizationUrl(stateToken) {
  const config = resolveQuickBooksConfig();

  if (!config.clientId || !config.redirectUri) {
    throw createConfigError(
      "QuickBooks OAuth is not configured. Set QB_CLIENT_ID and QB_REDIRECT_URI.",
      500
    );
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: QUICKBOOKS_SCOPE,
    state: stateToken
  });

  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

module.exports = {
  QUICKBOOKS_SCOPE,
  createQuickBooksAuthorizationUrl,
  createQuickBooksClient,
  resolveQuickBooksConfig
};
