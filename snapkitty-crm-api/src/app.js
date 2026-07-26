const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const attachActivityLogger = require("./middleware/activity-logger");
const { errorHandler, notFoundHandler } = require("./middleware/error-handler");
const activityRoutes = require("./routes/activity");
const contactRoutes = require("./routes/contacts");
const financeRoutes = require("./routes/finance");
const glRoutes = require("./routes/gl");
const tier2Routes = require("./routes/tier2");
const tier3Routes = require("./routes/tier3");
const vegRoutes = require("./routes/veg");
const authRoutes = require("./routes/auth");
const executeRoutes = require("./routes/execute");
const { shutdownBridge } = require("./middleware/lean-gate");

const app = express();

function isAllowedOrigin(origin) {
  if (!origin || origin === "null") {
    return true;
  }

  return env.clientOrigins.includes(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(attachActivityLogger);

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "snapkitty-erp", uptime: process.uptime(), time: new Date().toISOString() });
});

app.use("/api/contacts", contactRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/gl", glRoutes);
app.use("/api/consolidation", tier2Routes);
app.use("/api/forge", tier3Routes);
app.use("/api/veg", vegRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/execute", executeRoutes);

// SOVEREIGN HEARTBEAT: Automated Recovery
app.get("/api/heartbeat", (req, res) => {
  res.json({
    status: "SOVEREIGN",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown — kill Rust bridge
process.on('SIGTERM', shutdownBridge);
process.on('SIGINT', shutdownBridge);

// CRITICAL FAILURE PROTECTION
process.on('uncaughtException', (err) => {
  console.error('>>> [CRITICAL] Uncaught Exception:', err);
  // In a sovereign system, we log and attempt graceful recovery
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('>>> [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`SnapKitty CRM API listening on port ${env.port}`);
  });
}

module.exports = app;
