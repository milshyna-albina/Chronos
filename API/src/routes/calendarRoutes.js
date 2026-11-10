const express = require('express');
const CalendarController = require('../controllers/CalendarController');
const { authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authorize, CalendarController.getCalendarsWithEvents);
router.post('/', authorize, CalendarController.createCalendar);
router.patch('/:calendar_id', authorize, CalendarController.updateCalendar);
router.delete('/:calendar_id', authorize, CalendarController.deleteCalendar);
router.post('/:calendar_id/share', authorize, CalendarController.shareCalendar);
router.delete('/:calendar_id/share/:user_id', authorize, CalendarController.removeMember);
router.post('/:calendar_id/events', authorize, CalendarController.createEvent);

module.exports = router;