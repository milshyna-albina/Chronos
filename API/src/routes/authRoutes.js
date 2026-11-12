const express = require('express');
const AuthController = require('../controllers/AuthController');
const { softAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/confirm-email', AuthController.confirmEmail);
router.post('/resend-code', AuthController.resendConfirmationCode);
router.post('/password-reset', AuthController.passwordResetRequest);
router.post('/password-reset/:token', AuthController.passwordResetConfirm);
router.get('/status', softAuth, AuthController.checkStatus);

module.exports = router;