const Calendar = require('../models/Calendar');
const Event = require('../models/Event');
const Tag = require('../models/Tag');
const {
  isNameValid,
  isDescriptionValid,
  isColorValid,
  isTypeValid,
  isTagValid,
  validateRecurrence
} = require('../utils/validator');

class EventController {
  async createEvent(req, res) {
    try {
      const { calendar_id } = req.params;

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        $or: [
          { owner: req.user.id },
          { sharedWith: { $elemMatch: { user: req.user.id, role: 'editor' } } }
        ]
      });
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found or you do not have permission to add events to it.'
        });
      }

      let { startDate, endDate } = req.body;
      const {
        name, description, type, isAllDay, location, color, tags, recurrence
      } = req.body;

      if (!name) {
        return res.status(400).json({
          message: 'Name is required.'
        });
      }
      if (!type) {
        return res.status(400).json({
          message: 'Type is required.'
        });
      }
      if (!startDate) {
        return res.status(400).json({
          message: "'startDate' is required."
        });
      }
      if (!isNameValid(name)) {
        return res.status(400).json({
          message: 'Name must be 1-200 characters long.'
        });
      }
      if (description && !isDescriptionValid(description)) {
        return res.status(400).json({
          message: 'Description must not be empty.'
        });
      }
      if (!isTypeValid(type)) {
        return res.status(400).json({
          message: "Type must be 'arrangement', 'reminder' or 'task'."
        });
      }
      if (isAllDay && typeof isAllDay !== 'boolean') {
        return res.status(400).json({
          message: "'isAllDay' must be boolean."
        });
      }
      if (location && !isDescriptionValid(location)) {
        return res.status(400).json({
          message: 'Location must not be empty.'
        });
      }
      if (color && !isColorValid(color)) {
        return res.status(400).json({
          message: 'Invalid color format.'
        });
      }

      let tagIds = [];
      if (tags) {
        const tagsArray = Array.isArray(tags) ? tags : [tags];
        const tagNames = tagsArray
          .filter(tag => isTagValid(tag))
          .map(tag => tag.trim().toLowerCase());

        if (tagNames.length > 0) {
          const existing = await Tag.find({
            userId: req.user.id,
            name: { $in: tagNames }
          });
          if (existing.length !== tagNames.length) {
            return res.status(400).json({
              message: 'One or more specified tags do not exist or do not belong to you.'
            });
          }
          tagIds = existing.map(tag => tag._id);
        }
      }

      const parsedStart = new Date(startDate);
      if (isNaN(parsedStart.getTime())) {
        return res.status(400).json({
          message: "Invalid 'startDate' format."
        });
      }

      let parsedEnd;
      if (endDate) {
        parsedEnd = new Date(endDate);
        if (isNaN(parsedEnd.getTime())) {
          return res.status(400).json({
            message: "Invalid 'endDate' format."
          });
        }
        if (parsedStart > parsedEnd) {
          return res.status(400).json({
            message: "'startDate' cannot be later than 'endDate'."
          });
        }
      } else {
        if (type === 'arrangement') {
          parsedEnd = new Date(parsedStart.getTime() + 60 * 60 * 1000);
        } else {
          parsedEnd = parsedStart;
        }
      }

      if (recurrence !== undefined) {
        const validateRes = validateRecurrence(recurrence, parsedStart);
        if (!validateRes.isValid) {
          return res.status(400).json({
            message: validateRes.message
          });
        }
      }

      const newEvent = await Event.create({
        name: name,
        description: description || '',
        calendarId: calendar_id,
        createdBy: req.user.id,
        type: type,
        startDate: parsedStart,
        endDate: parsedEnd,
        isAllDay: isAllDay || false,
        location: location || '',
        color: color || calendar.color,
        tags: tagIds || [],
        recurrence: recurrence || { frequency: 'none' }
      });

      res.status(201).json({
        message: 'Event created successfully.',
        event: newEvent
      });
    } catch (error) {
      console.error('[CalendarController.createEvent]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new EventController();