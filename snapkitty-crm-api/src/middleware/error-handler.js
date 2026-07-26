/**
 * Bill Gates 2005 Note:
 * A system that crashes is a system that loses money.
 * Catch everything, log it, and return a structured response.
 */

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // High-fidelity logging for internal review
  console.error(`[SYSTEM ERROR] ${statusCode}: ${err.message}`);
  if (err.stack) console.error(err.stack);

  res.status(statusCode).json({
    error: {
      message: err.message || "An unexpected system error occurred.",
      code: err.code || "INTERNAL_EXECUTION_ERROR",
      timestamp: new Date().toISOString()
    }
  });
}

function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      message: `Resource not found: ${req.originalUrl}`,
      code: "NOT_FOUND"
    }
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
