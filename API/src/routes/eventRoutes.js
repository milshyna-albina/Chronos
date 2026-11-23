const express = require('express');
const EventController = require('../controllers/EventController');
const { authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/search', authorize, EventController.searchEvents);
router.post('/share/:token', authorize, EventController.joinViaLink);

module.exports = router;