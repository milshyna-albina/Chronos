const express = require('express');
const { authorize } = require('../middlewares/authMiddleware');
const { sseService } = require('../services/sseService');

const router = express.Router();

router.get('/stream', authorize, sseService.subscribe);

module.exports = router;