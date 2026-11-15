const Calendar = require('../models/Calendar');
const Event = require('../models/Event');
const Tag = require('../models/Tag');
const {
  isNameValid,
  isDescriptionValid,
  isColorValid,
  isTagValid,
  isTypeValid,
  isChannelValid,
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
        name, description, type, isAllDay, location, color, tags,
        recurrence, notificationChannel, reminderMinutesBefore
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
      if (reminderMinutesBefore !== undefined) {
        if (!Number.isInteger(reminderMinutesBefore) || reminderMinutesBefore < 0) {
          return res.status(400).json({
            message: "'reminderMinutesBefore' must be an integer" +
              " greater than or equal to 0"
          });
        }
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

      let channel = notificationChannel;
      if (type === 'arrangement') {
        channel = 'in-app';
      } else if (type === 'reminder' && !isChannelValid(channel)) {
        channel = 'email';
      } else if (type === 'task') {
        channel = channel || 'none';
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
        notificationChannel: channel,
        reminderMinutesBefore: reminderMinutesBefore || 15,
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

  async updateEvent(req, res) {
    try {
      const { calendar_id, event_id } = req.params;

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        $or: [
          { owner: req.user.id },
          { sharedWith: { $elemMatch: { user: req.user.id, role: 'editor' } } }
        ]
      });
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found or you do not have permission to edit events in it.'
        });
      }

      const event = await Event.findOne({
        _id: event_id,
        calendarId: calendar_id
      });
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }

      const {
        name, description, type, startDate, endDate,
        isAllDay, isCompleted, location, color, tags, recurrence,
        notificationChannel, reminderMinutesBefore
      } = req.body;

      if (name !== undefined) {
        if (!isNameValid(name)) {
          return res.status(400).json({
            message: 'Name must be 1-200 characters long.'
          });
        }
        event.name = name;
      }
      if (description !== undefined) {
        if (!isDescriptionValid(description)) {
          return res.status(400).json({
            message: 'Description must not be empty.'
          });
        }
        event.description = description;
      }
      if (type !== undefined) {
        if (!isTypeValid(type)) {
          return res.status(400).json({
            message: "Type must be 'arrangement', 'reminder' or 'task'."
          });
        }
        event.type = type;
      }
      const currentType = type !== undefined ? type : event.type;

      if (isAllDay !== undefined) {
        if (typeof isAllDay !== 'boolean') {
          return res.status(400).json({
            message: "'isAllDay' must be boolean."
          });
        }
        event.isAllDay = isAllDay;
      }
      if (isCompleted !== undefined) {
        if (typeof isCompleted !== 'boolean') {
          return res.status(400).json({
            message: "'isCompleted' must be boolean."
          });
        }
        if (currentType !== 'task') {
          return res.status(400).json({
            message: "Only events of type 'task' can be marked as completed."
          });
        }
        event.isCompleted = isCompleted;
      }
      if (location !== undefined) {
        if (!isDescriptionValid(location)) {
          return res.status(400).json({
            message: 'Location must not be empty.'
          });
        }
        event.location = location;
      }
      if (color !== undefined) {
        if (!isColorValid(color)) {
          return res.status(400).json({
            message: 'Invalid color format.'
          });
        }
        event.color = color;
      }
      if (reminderMinutesBefore !== undefined) {
        if (!Number.isInteger(reminderMinutesBefore) || reminderMinutesBefore < 0) {
          return res.status(400).json({
            message: "'reminderMinutesBefore' must be an integer" +
              " greater than or equal to 0"
          });
        }
        event.reminderMinutesBefore = reminderMinutesBefore;
      }
      if (tags !== undefined) {
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
        event.tags = tagIds;
      }

      let parsedStart = event.startDate;
      let parsedEnd = event.endDate;

      if (startDate !== undefined) {
        parsedStart = new Date(startDate);
        if (isNaN(parsedStart.getTime())) {
          return res.status(400).json({
            message: "Invalid 'startDate' format."
          });
        }
        event.startDate = parsedStart;
      }
      if (endDate !== undefined) {
        if (endDate === null) {
          parsedEnd = event.type === 'arrangement'
          ? new Date(new Date(event.startDate).getTime() + 60 * 60 * 1000)
          : event.startDate;
        } else {
          parsedEnd = new Date(endDate);
          if (isNaN(parsedEnd.getTime())) {
            return res.status(400).json({
              message: "Invalid 'endDate' format."
            });
          }
        }
        event.endDate = parsedEnd;
      }
      if (new Date(event.startDate) > new Date(event.endDate)) {
        return res.status(400).json({
          message: "'startDate' cannot be later than 'endDate'."
        });
      }
      if (recurrence !== undefined) {
        const validateRes = validateRecurrence(recurrence, new Date(event.startDate));
        if (!validateRes.isValid) {
          return res.status(400).json({
            message: validateRes.message
          });
        }
        event.recurrence = recurrence;
      }

      let channel = notificationChannel !== undefined
      ? notificationChannel
      : event.notificationChannel;

      if (currentType === 'arrangement') {
        channel = 'in-app';
      } else if (currentType === 'reminder' && !isChannelValid(channel)) {
        channel = 'email';
      } else if (currentType === 'task') {
        channel = channel || 'none';
      }
      event.notificationChannel = channel;

      await event.save();

      res.status(200).json({
        message: 'Event updated successfully.',
        event: event
      });
    } catch (error) {
      console.error('[CalendarController.updateEvent]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async deleteEvent(req, res) {
    try {
      const { calendar_id, event_id } = req.params;

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        $or: [
          { owner: req.user.id },
          { sharedWith: { $elemMatch: { user: req.user.id, role: 'editor' } } }
        ]
      });
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found or you do not have permission to delete events in it.'
        });
      }

      const event = await Event.findOneAndDelete({
        _id: event_id,
        calendarId: calendar_id
      });
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }

      res.status(200).json({
        message: 'Event deleted successfully.',
        eventId: event_id
      });
    } catch (error) {
      console.error('[CalendarController.deleteEvent]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new EventController();