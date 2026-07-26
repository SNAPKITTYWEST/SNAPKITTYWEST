const rateLimit = require("express-rate-limit");
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require("../config/env");

const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: RATE_LIMIT_MAX_REQUESTS || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
    code: "AUTH_RATE_LIMIT_EXCEEDED"
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

const financeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many finance requests. Please try again later.",
    code: "FINANCE_RATE_LIMIT_EXCEEDED"
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  financeLimiter
};