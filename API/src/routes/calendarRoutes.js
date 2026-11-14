const express = require('express');
const CalendarController = require('../controllers/CalendarController');
const EventController = require('../controllers/EventController');
const { authorize } = require('../middlewares/authMiddleware');
const { validateId } = require('../middlewares/validateId');

const router = express.Router();

router.get('/', authorize, CalendarController.getCalendarsWithEvents);
router.post('/', authorize, CalendarController.createCalendar);
router.post('/share/:token', authorize, CalendarController.joinViaLink);
router.patch(
  '/:calendar_id',
  authorize,
  validateId('calendar_id'),
  CalendarController.updateCalendar
);
router.patch(
  '/:calendar_id/hide',
  authorize,
  validateId('calendar_id'),
  CalendarController.toggleVisibility
);
router.delete(
  '/:calendar_id',
  authorize,
  validateId('calendar_id'),
  CalendarController.deleteCalendar
);
router.post(
  '/:calendar_id/share',
  authorize,
  validateId('calendar_id'),
  CalendarController.shareCalendar
);
router.patch(
  '/:calendar_id/invites',
  authorize,
  validateId('calendar_id'),
  CalendarController.respondToInvite
);
router.post(
  '/:calendar_id/link',
  authorize,
  validateId('calendar_id'),
  CalendarController.generateShareLink
);
router.delete(
  '/:calendar_id/link',
  authorize,
  validateId('calendar_id'),
  CalendarController.disableShareLink
);
router.patch(
  '/:calendar_id/share/:user_id',
  authorize,
  validateId('calendar_id'),
  validateId('user_id'),
  CalendarController.updateMember
);
router.delete(
  '/:calendar_id/share/:user_id',
  authorize,
  validateId('calendar_id'),
  validateId('user_id'),
  CalendarController.removeMember
);
router.post(
  '/:calendar_id/events',
  authorize,
  validateId('calendar_id'),
  EventController.createEvent
);

module.exports = router;