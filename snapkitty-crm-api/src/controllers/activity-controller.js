const auditLogService = require("../services/audit-log");

/**
 * Bill Gates 2005 Note:
 * Observability is the difference between a tool and an OS.
 * We are building the latter.
 */
async function getActivityStream(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await auditLogService.getRecentActivity(limit);

    // We wrap this in a schema-versioned envelope.
    // Forward compatibility is key to long-term dominance.
    res.json({
      schemaVersion: "2.1.0",
      events: activities.map(a => ({
        id: a.id,
        eventType: a.category,
        text: a.text,
        timestamp: a.createdAt,
        metadata: a.metadata,
        immutable: true
      }))
    });
  } catch (error) {
    next(error);
  }
}

async function postManualEvent(req, res, next) {
  try {
    const { text, category, metadata } = req.body;
    if (!text || !category) {
      const err = new Error("Event 'text' and 'category' are required for manual injection.");
      err.statusCode = 400;
      throw err;
    }

    const event = await auditLogService.pushActivity({ text, category, metadata });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getActivityStream,
  postManualEvent
};
