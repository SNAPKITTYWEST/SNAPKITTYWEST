const authService = require('../services/auth-service');
const auditLog = require('../services/audit-log');

/**
 * Initiates the Microsoft Entra ID Login flow
 */
exports.login = (req, res) => {
    const authUrl = authService.getAuthUrl();
    res.redirect(authUrl);
};

/**
 * Handles the callback from Microsoft Entra ID
 */
exports.callback = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
    }

    try {
        const tokenData = await authService.exchangeCodeForToken(code);
        const verification = await authService.verifyIdToken(tokenData.id_token);

        if (!verification.valid) {
            throw new Error(verification.error);
        }

        // Log the successful authentication to the audit trail
        auditLog.log('IDENTITY_AUTH_SUCCESS', {
            user: verification.email,
            role: verification.role,
            correlationId: req.headers['x-correlation-id']
        });

        // Set the session/cookie (In a real app, use a secure session)
        // For our Bifrost bridge, we'll return the token data to the frontend
        res.redirect(`/app.html?auth_status=success&token=${tokenData.id_token}&user=${verification.name}`);

    } catch (error) {
        console.error('>>> [AUTH] Callback Error:', error);
        res.redirect('/index.html?auth_status=failed');
    }
};
