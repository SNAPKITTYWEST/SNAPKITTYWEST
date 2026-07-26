const express = require("express");
const activityController = require("../controllers/activity-controller");

const router = express.Router();

/**
 * Bill Gates 2005 Note:
 * The activity stream is the heartbeat of the Sovereign OS.
 * Expose it clearly, version it strictly.
 */
router.get("/", activityController.getActivityStream);
router.post("/emit", activityController.postManualEvent);

module.exports = router;
