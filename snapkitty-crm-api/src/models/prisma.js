const { PrismaClient } = require("@prisma/client");
const env = require("../config/env");

const prisma = new PrismaClient({
  log: env.nodeEnv === "development" ? ["query", "info", "warn", "error"] : ["error"],
});

// Bill Gates 2005 Note: Fail fast, fail hard.
prisma.$connect()
  .then(() => console.log(">>> [DATABASE] Connected to Sovereign Ledger"))
  .catch((err) => {
    console.error("!!! [DATABASE] Connection failed. Critical System Error.");
    console.error(err);
    process.exit(1);
  });

module.exports = prisma;
