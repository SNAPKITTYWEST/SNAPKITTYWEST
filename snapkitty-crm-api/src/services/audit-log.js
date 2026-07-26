const prisma = require("../models/prisma");

/**
 * Bill Gates 2005 Perspective:
 * If it isn't logged, it didn't happen. Trust is built on transparency.
 */
async function pushActivity({ text, category, metadata = {} }) {
  try {
    const activity = await prisma.activity.create({
      data: {
        text,
        category,
        metadata,
      },
    });
    console.log(`[ACTIVITY LOGGED] ${category}: ${text}`);
    return activity;
  } catch (error) {
    // In a mission-critical system, we log to stderr if the DB log fails.
    console.error("!!! [CRITICAL] Failed to write to Activity Log:", error);
  }
}

async function getRecentActivity(limit = 50) {
  return prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

module.exports = {
  pushActivity,
  getRecentActivity,
};
