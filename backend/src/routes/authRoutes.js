const express = require('express');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

router.get('/register', AuthController.register);

module.exports = router;