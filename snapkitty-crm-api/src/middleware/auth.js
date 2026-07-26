const jwt = require("jsonwebtoken");

const env = require("../config/env");
const crypto = require("crypto");

const ROLES = {
  ADMIN: "admin",
  TREASURER: "treasurer",
  OPERATOR: "operator",
  VIEWER: "viewer"
};

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.TREASURER]: 3,
  [ROLES.OPERATOR]: 2,
  [ROLES.VIEWER]: 1
};

function generateTokens(payload) {
  const accessToken = jwt.sign(payload, env.jwtSecret, {
    expiresIn: "15m"
  });
  
  const refreshToken = jwt.sign(
    { sub: payload.sub, type: "refresh" },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
  
  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      error: "Authentication required.",
      code: "NO_TOKEN"
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    req.user.role = decoded.role || ROLES.VIEWER;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired. Please refresh.",
        code: "TOKEN_EXPIRED"
      });
    }
    return res.status(401).json({
      error: "Invalid or expired auth token.",
      code: "INVALID_TOKEN"
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const allowedLevels = allowedRoles.map(r => ROLE_HIERARCHY[r]).sort((a, b) => b - a);
    
    if (!allowedRoles.length || allowedLevels.some(level => userLevel >= level)) {
      return next();
    }
    
    return res.status(403).json({
      error: "Insufficient permissions.",
      required: allowedRoles,
      current: req.user.role
    });
  };
}

function requireTreasurer(requireAuth) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    
    if (req.user.role !== ROLES.TREASURER && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        error: "Treasurer access required.",
        required: [ROLES.TREASURER, ROLES.ADMIN],
        current: req.user.role
      });
    }
    
    return next();
  };
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  requireAuth,
  requireRole,
  requireTreasurer
};
