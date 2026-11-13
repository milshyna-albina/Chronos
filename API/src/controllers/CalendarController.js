const crypto = require('crypto');
const Calendar = require('../models/Calendar');
const Event = require('../models/Event');
const User = require('../models/User');
const Tag = require('../models/Tag');
const { sendInviteEmail } = require('../utils/mail');
const {
  isNameValid,
  isDescriptionValid,
  isColorValid,
  isRoleValid,
  isTypeValid,
  isTagValid,
  isActionValid
} = require('../utils/validator');

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
          { owner: req.user.id },
          { 'sharedWith.user': req.user.id }
        ]
      }).populate('owner', 'login email avatarPath')
        .populate('sharedWith.user', 'login email avatarPath');

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

      const events = await Event.find(eventQuery)
        .populate('createdBy', 'login email')
        .populate({
          path: 'tags',
          match: { userId: req.user.id }
        });
      const eventsByCalendarId = {};

      events.forEach(event => {
        const calendarId = event.calendarId.toString();
        if (!eventsByCalendarId[calendarId]) {
          eventsByCalendarId[calendarId] = [];
        }
        event.tags = event.tags.filter(tag => tag !== null);
        eventsByCalendarId[calendarId].push(event);
      });

      const ownedCalendars = [];
      const sharedCalendars = [];

      calendars.forEach(c => {
        const calendar = c.toJSON();
        calendar.events = eventsByCalendarId[c._id.toString()] || [];

        if (c.owner._id.toString() === req.user.id.toString()) {
          ownedCalendars.push(calendar);
        } else {
          sharedCalendars.push(calendar);
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
      const { name, description, color } = req.body;

      if (!name) {
        return res.status(400).json({
          message: 'Name is required.'
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
      if (color && !isColorValid(color)) {
        return res.status(400).json({
          message: 'Invalid color format.'
        });
      }

      const calendar = await Calendar.create({
        name: name,
        description: description || '',
        owner: req.user.id,
        isDefault: false,
        color: color || '#dfc1cc'
      });

      res.status(201).json({
        message: 'Calendar created successfully.',
        calendar: calendar
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
          message: 'Calendar not found or you do not have permission to edit it.'
        });
      }

      const { name, description, color, isHidden } = req.body;

      if (name) {
        if (!isNameValid(name)) {
          return res.status(400).json({
            message: 'Name must be 1-200 characters long.'
          });
        }
        calendar.name = name;
      }
      if (description) {
        if (!isDescriptionValid(description)) {
          return res.status(400).json({
            message: 'Description must not be empty.'
          });
        }
        calendar.description = description;
      }
      if (color) {
        if (!isColorValid(color)) {
          return res.status(400).json({
            message: 'Invalid color format.'
          });
        }
        calendar.color = color;
      }
      if (isHidden) {
        if (typeof isHidden !== 'boolean') {
          return res.status(400).json({
            message: "'isHidden' must be boolean."
          });
        }
        if (calendar.owner.toString() !== req.user.id.toString()) {
          return res.status(400).json({
            message: "Only owner can hide calendar."
          });
        }
        calendar.isHidden = isHidden;
      }

      calendar.save();

      res.status(200).json({
        message: 'Calendar updated successfully.',
        calendar: calendar
      });
    } catch (error) {
      console.error('[CalendarController.updateCalendar]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async toggleVisibility(req, res) {
    try {
      const { calendar_id } = req.params;

      const calendar = await Calendar.findById(calendar_id);
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }

      const { isHidden } = req.body;
      if (isHidden === undefined) {
        return res.status(400).json({
          message: "'isHidden' is required."
        });
      }
      if (typeof isHidden !== 'boolean') {
        return res.status(400).json({
          message: "'isHidden' must be boolean."
        });
      }

      if (calendar.owner.toString() === req.user.id.toString()) {
        if (calendar.isDefault && isHidden === true) {
          return res.status(400).json({
            message: "Cannot hide default calendar."
          });
        }
        calendar.isHidden = isHidden;
      } else {
        const member = calendar.sharedWith.find(
          m => m.user.toString() === req.user.id.toString()
        );
        if (!member) {
          return res.status(403).json({
            message: "Access denied."
          });
        }
        member.isHidden = isHidden;
      }

      calendar.save();

      res.status(200).json({
        message: 'Visibility updated successfully.'
      });
    } catch (error) {
      console.error('[CalendarController.toggleVisibility]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async deleteCalendar(req, res) {
    try {
      const { calendar_id } = req.params;

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        owner: req.user.id
      });

      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found or you do not have permission to delete it.'
        });
      }
      if (calendar.isDefault) {
        return res.status(400).json({
          message: 'Your primary calendar cannot be deleted.'
        });
      }

      await Event.deleteMany({ calendarId: calendar._id });
      await calendar.deleteOne();

      res.status(200).json({
        message: 'Calendar and all its events deleted successfully.'
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
      const { calendar_id } = req.params;
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

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        owner: req.user.id
      }).populate('owner', 'login');
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found or you do not have permission to share it.'
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
          message: 'You cannot share a calendar with yourself.'
        });
      }

      const alreadyShared = calendar.sharedWith.some(
        item => item.user.toString() === user._id.toString()
      );
      if (alreadyShared) {
        return res.status(400).json({
          message: 'Calendar is already shared with this user.'
        });
      }

      const expirationDays = 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      await sendInviteEmail(email, calendar.name, calendar.owner.login);

      calendar.sharedWith.push({
        user: user._id,
        role: role,
        status: 'pending',
        expiresAt: expiresAt
      });
      await calendar.save();

      res.status(200).json({
        message: 'Calendar shared successfully.',
        sharedWith: calendar.sharedWith
      });
    } catch (error) {
      console.error('[CalendarController.shareCalendar]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async respondToInvite(req, res) {
    try {
      const { calendar_id } = req.params;
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

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        'sharedWith.user': req.user.id,
        'sharedWith.status': 'pending',
      });
      if (!calendar) {
        return res.status(404).json({
          message: 'Pending invitation not found.'
        });
      }

      const member = calendar.sharedWith.find(
        item => item.user.toString() === req.user.id.toString()
      );

      if (new Date() > new Date(member.expiresAt)) {
        calendar.sharedWith = calendar.sharedWith.filter(
          item => item.user.toString() !== req.user.id.toString()
        );
        await calendar.save();

        return res.status(400).json({
          message: 'This invitation has expired.'
        });
      }

      if (action === 'accept') {
        member.status = 'accepted';
        member.expiresAt = undefined;
        await calendar.save();

        return res.status(200).json({
          message: 'Invitation accepted successfully.'
        });
      }

      if (action === 'decline') {
        calendar.sharedWith = calendar.sharedWith.filter(
          item => item.user.toString() !== req.user.id.toString()
        );
        await calendar.save();

        return res.status(200).json({
          message: 'Invitation declined successfully.'
        });
      }
    } catch (error) {
      console.error('[CalendarController.respondToInvite]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async generateShareLink(req, res) {
    try {
      const { calendar_id } = req.params;
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

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        owner: req.user.id
      });
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found or you do not have permission to edit it.'
        });
      }

      const token = crypto.randomUUID();
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      calendar.shareToken = tokenHash;
      calendar.isPublicEnabled = true;
      calendar.publicRole = role;

      await calendar.save();

      const link = `${process.env.FRONTEND_URL}/calendar/share?token=${token}`;

      res.status(200).json({
        message: 'Share link generated successfully.',
        link: link,
        isPublicEnabled: calendar.isPublicEnabled,
        publicRole: calendar.publicRole
      });
    } catch (error) {
      console.error('[CalendarController.generateShareLink]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async disableShareLink(req, res) {
    try {
      const { calendar_id } = req.params;

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        owner: req.user.id
      });
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found or you do not have permission to edit it.'
        });
      }

      calendar.isPublicEnabled = false;
      calendar.shareToken = undefined;

      await calendar.save();

      res.status(200).json({
        message: 'Share link disabled successfully.',
        isPublicEnabled: calendar.isPublicEnabled
      });
    } catch (error) {
      console.error('[CalendarController.disableShareLink]:', error.message);
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
      const calendar = await Calendar.findOne({
        shareToken: tokenHash,
        isPublicEnabled: true
      });
      if (!calendar) {
        return res.status(404).json({
          message: 'Invalid, expired, or disabled invite link.'
        });
      }

      if (calendar.owner.toString() === req.user.id.toString()) {
        return res.status(400).json({
          message: 'You are the owner of this calendar.'
        });
      }

      const member = calendar.sharedWith.find(
        item => item.user.toString() === req.user.id.toString()
      );
      if (!member) {
        calendar.sharedWith.push({
          user: req.user.id,
          role: calendar.publicRole,
          status: 'accepted'
        });
        await calendar.save();
      }
      res.status(200).json({
        message: 'Joined to the calendar successfully.',
        calendarId: calendar._id
      });
    } catch (error) {
      console.error('[CalendarController.joinViaLink]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async updateMember(req, res) {
    try {
      const { calendar_id, user_id } = req.params;
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

      const calendar = await Calendar.findOne({
        _id: calendar_id,
        owner: req.user.id
      });
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found or you do not have permission to edit it.'
        });
      }

      const member = calendar.sharedWith.find(
        item => item.user.toString() === user_id.toString()
      );
      if (!member) {
        return res.status(404).json({
          message: 'Member not found in this calendar sharing list.'
        });
      }

      member.role = role;
      await calendar.save();

      res.status(200).json({
        message: 'Member updated successfully.',
        sharedWith: calendar.sharedWith
      });
    } catch (error) {
      console.error('[CalendarController.updateMember]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async removeMember(req, res) {
    try {
      const { calendar_id, user_id } = req.params;

      const calendar = await Calendar.findById(calendar_id);
      if (!calendar) {
        return res.status(404).json({
          message: 'Calendar not found.'
        });
      }

      const isOwner = calendar.owner.toString() === req.user.id.toString();
      const isSelfRemoval = req.user.id.toString() === user_id.toString();

      if (!isOwner && !isSelfRemoval) {
        return res.status(403).json({
          message: 'You do not have permission to remove this member.'
        });
      }

      const memberExists = calendar.sharedWith.some(
        item => item.user.toString() === user_id.toString()
      );
      if (!memberExists) {
        return res.status(404).json({
          message: 'Member not found in this calendar sharing list.'
        });
      }

      await Calendar.findByIdAndUpdate(calendar_id, {
        $pull: { sharedWith: { user: user_id } }
      });

      res.status(200).json({
        message: 'Member removed successfully.'
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

      const { name, description, type, isAllDay, location, color, tags } = req.body;
      let { startDate, endDate } = req.body;

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
        tags: tagIds || []
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

module.exports = new CalendarController();