const express = require('express');
const HolidayController = require('../controllers/HolidayController');
const { authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authorize, HolidayController.getHolidays);

module.exports = router;