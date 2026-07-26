const express = require("express");

const contactController = require("../controllers/contact-controller");

const router = express.Router();

router.get("/", contactController.listContacts);
router.post("/", contactController.createContact);

module.exports = router;
