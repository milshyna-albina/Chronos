const crypto = require('crypto');
const Calendar = require('../models/Calendar');
const Event = require('../models/Event');
const User = require('../models/User');
const agenda = require('../services/agendaService');
const { updateEventFields, scheduleEventReminder } = require('../services/eventService');
const { sendInviteToEventEmail } = require('../utils/mail');
const { isRoleValid, isActionValid } = require('../utils/validator');
const { canUserManageEvent, canUserDeleteEvent } = require('../utils/permissions');

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

      const event = new Event({
        calendarId: calendar_id,
        createdBy: req.user.id
      });

      const updateRes = await updateEventFields(
        event,
        req.body,
        req.user.id,
        true,
        calendar.color
      );
      if (updateRes.error) {
        return res.status(updateRes.error.status).json({
          message: updateRes.error.message
        });
      }

      await event.save();

      if (event.notificationChannel !== 'none') {
        const minutesBefore = event.type === 'reminder'
        ? 0 : (event.reminderMinutesBefore || 0)
        const reminderTime = new Date(
          new Date(event.startDate).getTime() - (minutesBefore * 60 * 1000)
        );
        if (reminderTime > new Date()) {
          await agenda.schedule(reminderTime, 'send-event-reminder', {
            event_id: event._id
          });
        }
      }

      res.status(201).json({
        message: 'Event created successfully.',
        event: event
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
      const { occurrenceStart, scope = 'all', ...fields } = req.body;

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
      if (!canUserManageEvent(req.user.id, calendar, event)) {
        return res.status(403).json({
          message: 'You do not have permission to edit this event.'
        });
      }

      const isRecurring = event.recurrence && event.recurrence.frequency !== 'none';

      if (isRecurring && scope === 'this') {
        if (!occurrenceStart) {
          return res.status(400).json({
            message: "'occurrenceStart' is required when updating a single occurrence."
          });
        }
        const occDate = new Date(occurrenceStart);
        if (Number.isNaN(occDate.getTime())) {
          return res.status(400).json({
            message: "Invalid 'occurrenceStart' format."
          });
        }
        const durationMs =
          new Date(event.endDate).getTime() - new Date(event.startDate).getTime();

        const overrideDoc = new Event({
          name: event.name,
          description: event.description,
          calendarId: event.calendarId,
          createdBy: event.createdBy,
          type: event.type,
          startDate: occDate,
          endDate: new Date(occDate.getTime() + durationMs),
          isAllDay: event.isAllDay,
          location: event.location,
          color: event.color,
          notificationChannel: event.notificationChannel,
          reminderMinutesBefore: event.reminderMinutesBefore,
          tags: event.tags,
          recurrence: { frequency: 'none' },
          recurringEventId: event._id,
          originalStartDate: occDate,
          participants: event.participants
        });

        const updateRes = await updateEventFields(overrideDoc, fields, req.user.id);
        if (updateRes.error) {
          return res.status(updateRes.error.status).json({
            message: updateRes.error.message
          });
        }

        const occTime = occDate.getTime();
        const alreadyExcluded = (event.exdates || []).some(
          d => new Date(d).getTime() === occTime
        );
        if (!alreadyExcluded) {
          event.exdates.push(occDate);
        }

        const savedOverride = await Event.findOneAndUpdate(
          { recurringEventId: event._id, originalStartDate: occDate },
          {
            $set: {
              name: overrideDoc.name,
              description: overrideDoc.description,
              type: overrideDoc.type,
              startDate: overrideDoc.startDate,
              endDate: overrideDoc.endDate,
              isAllDay: overrideDoc.isAllDay,
              isCompleted: overrideDoc.isCompleted,
              location: overrideDoc.location,
              color: overrideDoc.color,
              notificationChannel: overrideDoc.notificationChannel,
              reminderMinutesBefore: overrideDoc.reminderMinutesBefore,
              tags: overrideDoc.tags,
              recurrence: { frequency: 'none' },
              recurringEventId: event._id,
              originalStartDate: occDate
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await event.save();
        await scheduleEventReminder(savedOverride);

        return res.status(200).json({
          message: 'Event occurrence updated successfully.',
          event: savedOverride,
          seriesId: event._id,
          scope: 'this'
        });
      }

      const seriesFields = { ...fields };

      if (isRecurring && scope === 'all' && seriesFields.startDate) {
        const editedStart = new Date(seriesFields.startDate);
        if (!Number.isNaN(editedStart.getTime())) {
          const start = new Date(event.startDate);
          const adjustedStart = new Date(start);
          adjustedStart.setUTCHours(
            editedStart.getUTCHours(),
            editedStart.getUTCMinutes(),
            editedStart.getUTCSeconds(),
            editedStart.getUTCMilliseconds()
          );
          let adjustedEnd;
          if (seriesFields.endDate) {
            const editedEnd = new Date(seriesFields.endDate);
            if (!Number.isNaN(editedStart.getTime())) {
              const newDuration =
                Math.max(0, editedEnd.getTime() - editedStart.getTime());
              adjustedEnd = new Date(adjustedStart.getTime() + newDuration);
            }
          } else {
            const oldDuration =
              new Date(event.endDate).getTime() - new Date(event.startDate).getTime();
            adjustedEnd = new Date(adjustedStart.getTime() + oldDuration);
          }

          seriesFields.startDate = adjustedStart;
          if (adjustedEnd) {
            seriesFields.endDate = adjustedEnd;
          }
        }
      }

      const updateRes = await updateEventFields(event, seriesFields, req.user.id);
      if (updateRes.error) {
        return res.status(updateRes.error.status).json({
          message: updateRes.error.message
        });
      }

      await event.save();
      await scheduleEventReminder(event);

      res.status(200).json({
        message: 'Event updated successfully.',
        event: event,
        scope: isRecurring ? 'all' : 'single'
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
      const { occurrenceStart, scope = 'all' } = req.body;

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

      if (event.recurringEventId) {
        await agenda.cancel({ 'data.event_id': event._id.toString() });
        await event.deleteOne();

        return res.status(200).json({
          message: 'Event occurrence deleted successfully.',
          eventId: event._id.toString(),
          scope: 'this'
        });
      }

      const isRecurring = event.recurrence && event.recurrence.frequency !== 'none';

      if (isRecurring && scope === 'this') {
        if (!occurrenceStart) {
          return res.status(400).json({
            message: "'occurrenceStart' is required when deleting a single occurrence."
          });
        }
        const occDate = new Date(occurrenceStart);
        if (Number.isNaN(occDate.getTime())) {
          return res.status(400).json({
            message: "Invalid 'occurrenceStart' format."
          });
        }
        const occTime = occDate.getTime();
        const currentExdates = Array.isArray(event.exdates) ? event.exdates : [];
        const alreadyExcluded = currentExdates.some(
          d => new Date(d).getTime() === occTime
        );
        if (!alreadyExcluded) {
          event.set('exdates', [...currentExdates, occDate]);
          await event.save();
        }
        const existingOverride = await Event.findOne({
          recurringEventId: event._id,
          originalStartDate: occDate
        });
        if (existingOverride) {
          await agenda.cancel({ 'data.event_id': existingOverride._id.toString() });
          await existingOverride.deleteOne();
        }

        return res.status(200).json({
          message: 'Event occurrence deleted successfully.',
          seriesId: event._id.toString(),
          occurrenceStart: occDate.toISOString(),
          scope: 'this'
        });
      }

      if (isRecurring) { //all
        const overrides = await Event.find({
          recurringEventId: event._id
        }, '_id');
        const overrideIds = overrides.map(ov => ov._id.toString());
        if (overrideIds.length > 0) {
          await Promise.all([
            agenda.cancel({ 'data.event_id': { $in: overrideIds } }),
            Event.deleteMany({ recurringEventId: event._id })
          ]);
        }
      }

      await event.deleteOne();
      await agenda.cancel({ 'data.event_id': event._id.toString() });

      res.status(200).json({
        message: 'Event deleted successfully.',
        eventId: event._id.toString(),
        scope: isRecurring ? 'all' : 'single'
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
      if (!canUserManageEvent(req.user.id, calendar, event)) {
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

      const alreadyShared =
        event.createdBy.toString() === user._id.toString() ||
        event.participants.some(
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

      await sendInviteToEventEmail(
        email,
        { id: event._id, name: event.name },
        req.user.login
      );

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
      if (!canUserManageEvent(req.user.id, calendar, event)) {
        return res.status(403).json({
          message: 'You do not have permission to share this event.'
        });
      }

      const token = crypto.randomUUID();

      event.shareToken = crypto.createHash('sha256').update(token).digest('hex');
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
      if (!canUserManageEvent(req.user.id, calendar, event)) {
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
      } else if (member.status === 'pending') {
        member.status = 'accepted';
        member.expiresAt = undefined;
        if (member.role !== 'editor' && event.publicRole === 'editor') {
          member.role = 'editor';
        }
        await event.save();
      }

      res.status(200).json({
        message: 'Joined to the event successfully.',
        eventId: event._id,
        eventName: event.name
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
      if (!canUserManageEvent(req.user.id, calendar, event)) {
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

      const canManage = canUserManageEvent(req.user.id, calendar, event);
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