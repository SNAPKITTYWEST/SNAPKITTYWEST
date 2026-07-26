const auditLogService = require("../services/audit-log");

function attachActivityLogger(req, res, next) {
  req.pushActivity = auditLogService.pushActivity;
  next();
}

module.exports = attachActivityLogger;
