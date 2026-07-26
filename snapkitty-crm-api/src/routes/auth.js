const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');

// GET /auth/login - Redirects to Microsoft Entra ID
router.get('/login', authController.login);

// GET /auth/callback - Handles the response from Microsoft
router.get('/callback', authController.callback);

module.exports = router;
