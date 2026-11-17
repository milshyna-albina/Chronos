const crypto = require('crypto');
const Calendar = require('../models/Calendar');
const Event = require('../models/Event');
const Tag = require('../models/Tag');
const User = require('../models/User');
const agenda = require('../services/agendaService');
const {
  isNameValid,
  isDescriptionValid,
  isColorValid,
  isTagValid,
  isTypeValid,
  isChannelValid,
  validateRecurrence, isRoleValid, isActionValid
} = require('../utils/validator');
const {
  canUserEditEvent,
  canUserDeleteEvent,
  canUserShareEvent
} = require('../utils/permissions');

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

      if (newEvent.notificationChannel !== 'none') {
        const minutesBefore = newEvent.type === 'reminder'
        ? 0 : (newEvent.reminderMinutesBefore || 0)
        const reminderTime = new Date(
          newEvent.startDate.getTime() - (minutesBefore * 60 * 1000)
        );
        if (reminderTime > new Date()) {
          await agenda.schedule(reminderTime, 'send-event-reminder', {
            event_id: newEvent._id
          });
        }
      }

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

      const [calendar, event] = await Promise.all([
        Calendar.findById(calendar_id),
        Event.findOne({ _id: event_id, calendarId: calendar_id })
      ]);

      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }
      if (!canUserEditEvent(req.user.id, calendar, event)) {
        return res.status(403).json({
          message: 'You do not have permission to edit this event.'
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

      await agenda.cancel({ 'data.event_id': event_id });
      if (!event.isNotified && event_id.notificationChannel !== 'none') {
        const minutesBefore = newEvent.type === 'reminder'
          ? 0 : (newEvent.reminderMinutesBefore || 0)
        const reminderTime = new Date(
          newEvent.startDate.getTime() - (minutesBefore * 60 * 1000)
        );
        if (reminderTime > new Date()) {
          await agenda.schedule(reminderTime, 'send-event-reminder', {
            event_id: newEvent._id
          });
        }
      }

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

      const [calendar, event] = await Promise.all([
        Calendar.findById(calendar_id),
        Event.findOne({ _id: event_id, calendarId: calendar_id })
      ]);

      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }
      if (!canUserDeleteEvent(req.user.id, calendar, event)) {
        return res.status(403).json({
          message: 'You do not have permission to delete this event.'
        });
      }

      await event.deleteOne();
      await agenda.cancel({ 'data.event_id': event_id });

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

  async shareEvent(req, res) {
    try {
      const { calendar_id, event_id } = req.params;
      const { email, role } = req.body;

      if (!email) {
        return res.status(400).json({
          message: 'Email is required.'
        });
      }
      if (!role) {
        return res.status(400).json({
          message: 'Role is required.'
        });
      }
      if (!isRoleValid(role)) {
        return res.status(400).json({
          message: "Role must be 'editor' or 'viewer'."
        });
      }

      const [calendar, event] = await Promise.all([
        Calendar.findById(calendar_id),
        Event.findOne({ _id: event_id, calendarId: calendar_id })
      ]);

      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }
      if (!canUserShareEvent(req.user.id, calendar, event)) {
        return res.status(403).json({
          message: 'You do not have permission to share this event.'
        });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(404).json({
          message: 'User with this email not found.'
        });
      }
      if (user._id.toString() === req.user.id.toString()) {
        return res.status(400).json({
          message: 'You cannot share an event with yourself.'
        });
      }

      const alreadyShared = event.participants.some(
        item => item.user.toString() === user._id.toString()
      );
      if (alreadyShared) {
        return res.status(400).json({
          message: 'Event is already shared with this user.'
        });
      }

      const expirationDays = 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      //await sendInviteEmail(email, calendar.name, calendar.owner.login);

      event.participants.push({
        user: user._id,
        role: role,
        status: 'pending',
        expiresAt: expiresAt
      });
      await event.save();

      res.status(200).json({
        message: 'Event shared successfully.',
        participants: event.participants
      });
    } catch (error) {
      console.error('[EventController.shareCalendar]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async respondToInvite(req, res) {
    try {
      const { calendar_id, event_id } = req.params;
      const { action } = req.body;

      if (!action) {
        return res.status(400).json({
          message: 'Action is required.'
        });
      }
      if (!isActionValid(action)) {
        return res.status(400).json({
          message: "Action must be 'accept' or 'decline'."
        });
      }

      const event = await Event.findOne({
        _id: event_id,
        calendarId: calendar_id,
        participants: {
          $elemMatch: {
            user: req.user.id,
            status: 'pending'
          }
        }
      });
      if (!event) {
        return res.status(404).json({
          message: 'Pending invitation not found.'
        });
      }

      const member = event.participants.find(
        item => item.user.toString() === req.user.id.toString()
      );

      if (new Date() > new Date(member.expiresAt)) {
        event.participants = event.participants.filter(
          item => item.user.toString() !== req.user.id.toString()
        );
        await event.save();

        return res.status(400).json({
          message: 'This invitation has expired.'
        });
      }

      if (action === 'accept') {
        member.status = 'accepted';
        member.expiresAt = undefined;
        await event.save();

        return res.status(200).json({
          message: 'Invitation accepted successfully.'
        });
      }

      if (action === 'decline') {
        event.participants = event.participants.filter(
          item => item.user.toString() !== req.user.id.toString()
        );
        await event.save();

        return res.status(200).json({
          message: 'Invitation declined successfully.'
        });
      }
    } catch (error) {
      console.error('[EventController.respondToInvite]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async generateShareLink(req, res) {
    try {
      const { calendar_id, event_id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({
          message: 'Role is required.'
        });
      }
      if (!isRoleValid(role)) {
        return res.status(400).json({
          message: "Role must be 'editor' or 'viewer'."
        });
      }

      const [calendar, event] = await Promise.all([
        Calendar.findById(calendar_id),
        Event.findOne({ _id: event_id, calendarId: calendar_id })
      ]);

      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }
      if (!canUserShareEvent(req.user.id, calendar, event)) {
        return res.status(403).json({
          message: 'You do not have permission to share this event.'
        });
      }

      const token = crypto.randomUUID();
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      event.shareToken = tokenHash;
      event.isPublicEnabled = true;
      event.publicRole = role;

      await event.save();

      const link = `${process.env.FRONTEND_URL}/event/share?token=${token}`;

      res.status(200).json({
        message: 'Share link generated successfully.',
        link: link,
        isPublicEnabled: event.isPublicEnabled,
        publicRole: event.publicRole
      });
    } catch (error) {
      console.error('[EventController.generateShareLink]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async disableShareLink(req, res) {
    try {
      const { calendar_id, event_id } = req.params;

      const [calendar, event] = await Promise.all([
        Calendar.findById(calendar_id),
        Event.findOne({ _id: event_id, calendarId: calendar_id })
      ]);

      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }
      if (!canUserShareEvent(req.user.id, calendar, event)) {
        return res.status(403).json({
          message: 'You do not have permission to share this event.'
        });
      }

      event.isPublicEnabled = false;
      event.shareToken = undefined;

      await event.save();

      res.status(200).json({
        message: 'Share link disabled successfully.',
        isPublicEnabled: event.isPublicEnabled
      });
    } catch (error) {
      console.error('[EventController.disableShareLink]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async joinViaLink(req, res) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({
          message: `Invalid token ID.`
        });
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const event = await Event.findOne({
        shareToken: tokenHash,
        isPublicEnabled: true
      });
      if (!event) {
        return res.status(404).json({
          message: 'Invalid, expired, or disabled invite link.'
        });
      }

      if (event.createdBy.toString() === req.user.id.toString()) {
        return res.status(400).json({
          message: 'You are the creator of this event.'
        });
      }

      const member = event.participants.find(
        item => item.user.toString() === req.user.id.toString()
      );
      if (!member) {
        event.participants.push({
          user: req.user.id,
          role: event.publicRole,
          status: 'accepted'
        });
        await event.save();
      }
      res.status(200).json({
        message: 'Joined to the event successfully.',
        eventId: event._id
      });
    } catch (error) {
      console.error('[EventController.joinViaLink]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async updateMember(req, res) {
    try {
      const { calendar_id, event_id, user_id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({
          message: 'Role is required.'
        });
      }
      if (!isRoleValid(role)) {
        return res.status(400).json({
          message: "Role must be 'editor' or 'viewer'."
        });
      }

      const [calendar, event] = await Promise.all([
        Calendar.findById(calendar_id),
        Event.findOne({ _id: event_id, calendarId: calendar_id })
      ]);

      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }
      if (!canUserShareEvent(req.user.id, calendar, event)) {
        return res.status(403).json({
          message: 'You do not have permission to edit this event.'
        });
      }

      const member = event.participants.find(
        item => item.user.toString() === user_id.toString()
      );
      if (!member) {
        return res.status(404).json({
          message: 'Member not found in this event sharing list.'
        });
      }

      member.role = role;
      await event.save();

      res.status(200).json({
        message: 'Member updated successfully.',
        participants: event.participants
      });
    } catch (error) {
      console.error('[EventController.updateMember]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async removeMember(req, res) {
    try {
      const { calendar_id, event_id, user_id } = req.params;

      const [calendar, event] = await Promise.all([
        Calendar.findById(calendar_id),
        Event.findOne({ _id: event_id, calendarId: calendar_id })
      ]);

      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }
      if (!event) {
        return res.status(404).json({
          message: 'Event not found.'
        });
      }

      const canManage = canUserShareEvent(req.user.id, calendar, event);
      const isSelfRemoval = req.user.id.toString() === user_id.toString();

      if (!canManage && !isSelfRemoval) {
        return res.status(403).json({
          message: 'You do not have permission to remove this member.'
        });
      }

      if (event.createdBy.toString() === user_id.toString()) {
        return res.status(400).json({
          message: 'Event creator cannot be removed from sharing list.'
        });
      }

      const memberExists = event.participants.some(
        item => item.user.toString() === user_id.toString()
      );
      if (!memberExists) {
        return res.status(404).json({
          message: 'Member not found in this event sharing list.'
        });
      }

      await Event.findByIdAndUpdate(event_id, {
        $pull: { participants: { user: user_id } }
      });

      res.status(200).json({
        message: 'Member removed successfully.'
      });
    } catch (error) {
      console.error('[EventController.removeMember]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new EventController();