const Calendar = require('../models/Calendar');
const Event = require('../models/Event');

class CalendarController {
  async getCalendarsWithEvents(req, res) {
    try {
      let { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        startDate = new Date(year, month, 1).toISOString();
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
      } else {
        const parsedStart = new Date(startDate);
        const parsedEnd = new Date(endDate);

        if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
          return res.status(400).json({
            message: 'Invalid date format.'
          });
        }
        if (parsedStart > parsedEnd) {
          return res.status(400).json({
            message: "'startDate' cannot be later than 'endDate'."
          });
        }
      }

      const calendars = await Calendar.find({
        $or: [
          { owner: req.user._id },
          { 'sharedWith.userId': req.user._id }
        ]
      }).populate('owner', 'login email avatarPath');

      if (calendars.length === 0) {
        return res.status(200).json({ owned: [], shared: [] });
      }

      const calendarIds = calendars.map(c => c._id);
      const eventQuery = {
        calendarId: { $in: calendarIds },
        $or: [
          {
            startDate: { $lte: new Date(endDate) }, // field: (less than or equal) value
            endDate: { $gte: new Date(startDate) } // field: (greater than or equal) value
          }
        ]
      };

      const events = await Event.find(eventQuery);
      const eventsByCalendarId = {};

      events.forEach(event => {
        const calendarId = event.calendarId.toString();
        if (!eventsByCalendarId[calendarId]) {
          eventsByCalendarId[calendarId] = [];
        }
        eventsByCalendarId[calendarId].push(event);
      });

      const ownedCalendars = [];
      const sharedCalendars = [];

      calendars.forEach(c => {
        const cObj = c.toObject();
        cObj.events = eventsByCalendarId[c._id.toString()] || [];

        if (c.owner._id.toString() === req.user._id.toString()) {
          ownedCalendars.push(cObj);
        } else {
          sharedCalendars.push(cObj);
        }
      });

      res.status(200).json({
        owned: ownedCalendars,
        shared: sharedCalendars
      });
    } catch (error) {
      console.error('[CalendarController.getCalendarsWithEvents]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async createCalendar(req, res) {
    try {


      res.status(200).json({
        message: ''
      });
    } catch (error) {
      console.error('[CalendarController.createCalendar]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async updateCalendar(req, res) {
    try {


      res.status(200).json({
        message: ''
      });
    } catch (error) {
      console.error('[CalendarController.updateCalendar]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async deleteCalendar(req, res) {
    try {


      res.status(200).json({
        message: ''
      });
    } catch (error) {
      console.error('[CalendarController.deleteCalendar]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async shareCalendar(req, res) {
    try {


      res.status(200).json({
        message: ''
      });
    } catch (error) {
      console.error('[CalendarController.shareCalendar]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async removeMember(req, res) {
    try {


      res.status(200).json({
        message: ''
      });
    } catch (error) {
      console.error('[CalendarController.removeMember]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async createEvent(req, res) {
    try {


      res.status(200).json({
        message: ''
      });
    } catch (error) {
      console.error('[CalendarController.createEvent]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new CalendarController();