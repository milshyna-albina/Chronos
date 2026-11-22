const { RRule } = require('rrule');
const Event = require('../models/Event');
const Tag = require('../models/Tag');
const {
  isNameValid,
  isDescriptionValid,
  isTypeValid,
  isColorValid,
  isTagValid,
  validateRecurrence,
  isChannelValid
} = require("../utils/validator");
const agenda = require("./agendaService");

const FREQ_MAP = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY
};
const DAY_MAP = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

function buildRule(event) {
  const ruleOptions = {
    freq: FREQ_MAP[event.recurrence.frequency],
    interval: event.recurrence.interval || 1,
    dtstart: new Date(event.startDate),
    until: event.recurrence.until ? new Date(event.recurrence.until) : undefined
  };

  if (Array.isArray(event.recurrence.daysOfWeek) && event.recurrence.daysOfWeek.length > 0) {
    ruleOptions.byweekday = event.recurrence.daysOfWeek.map(d => DAY_MAP[d]);
  }

  return new RRule(ruleOptions);
}

function expandEvent(eventDoc, start, end, overrides = []) {
  const event = eventDoc.toJSON ? eventDoc.toJSON() : { ...eventDoc };

  if (Array.isArray(event.tags)) {
    event.tags = event.tags.filter(tag => tag !== null);
  }

  const hasRecurrence = event.recurrence && event.recurrence.frequency !== 'none';

  if (!hasRecurrence) {
    if (new Date(event.startDate) <= end && new Date(event.endDate) >= start) {
      return [{
        ...event,
        isRecurring: false,
        isOverride: Boolean(event.recurringEventId)
      }];
    }
    return [];
  }

  const rule = buildRule(event);
  const duration = new Date(event.endDate).getTime() - new Date(event.startDate).getTime();
  const excludedTimestamps = new Set(
    (event.exdates || []).map(d => new Date(d).getTime())
  );
  const normalizedOverrides = overrides.map(ovDoc => {
    const override = ovDoc.toJSON ? ovDoc.toJSON() : { ...ovDoc };
    if (Array.isArray(override.tags)) {
      override.tags = override.tags.filter(tag => tag !== null);
    }
    if (override.originalStartDate) {
      excludedTimestamps.add(new Date(override.originalStartDate).getTime());
    }
    return override;
  });
  const queryStart = new Date(Math.max(0, start.getTime() - duration));
  const occurrences = rule.between(queryStart, end, true);

  const result = [];
  for (const occStart of occurrences) {
    if (excludedTimestamps.has(occStart.getTime())) {
      continue;
    }
    const occEnd = new Date(occStart.getTime() + duration);
    if (occStart <= end && occEnd >= start) {
      result.push({
        ...event,
        seriesId: event.id,
        occurrenceStart: occStart,
        startDate: occStart,
        endDate: occEnd,
        isRecurring: true,
        isOverride: false
      });
    }
  }

  for (const ov of normalizedOverrides) {
    const ovStart = new Date(ov.startDate);
    const ovEnd = new Date(ov.endDate);
    if (ovStart <= end && ovEnd >= start) {
      result.push({
        ...ov,
        calendarId: ov.calendarId || event.calendarId,
        seriesId: event.id,
        occurrenceStart: ov.originalStartDate ? new Date(ov.originalStartDate) : ovStart,
        isRecurring: true,
        isOverride: true
      });
    }
  }

  return result;
}

function groupOverrides(overrideDocs) {
  const map = new Map();
  overrideDocs.forEach(doc => {
    const key = doc.recurringEventId.toString();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(doc);
  });

  return map;
}

const getEventsForCalendars = async (calendarIds, start, end, userId) => {
  if (!Array.isArray(calendarIds) || calendarIds.length === 0) {
    return {};
  }

  const eventQuery = {
    calendarId: { $in: calendarIds },
    recurringEventId: { $in: [null] },
    $or: [
      {
        'recurrence.frequency': 'none',
        startDate: { $lte: end }, // field: (less than or equal) value
        endDate: { $gte: start } // field: (greater than or equal) value
      },
      {
        'recurrence.frequency': {
          $in: ['daily', 'weekly', 'monthly', 'yearly']
        },
        startDate: { $lte: end },
        $or: [
          { 'recurrence.until': { $exists: false } },
          { 'recurrence.until': null },
          { 'recurrence.until': { $gte: start } }
        ]
      }
    ]
  };

  const rawEvents = await Event.find(eventQuery)
    .populate('createdBy', 'login email')
    .populate('participants.user', 'login email')
    .populate({
      path: 'tags',
      match: { userId: userId }
    });

  const recurringSeriesIds = rawEvents
    .filter(e => e.recurrence && e.recurrence.frequency !== 'none')
    .map(e => e._id);

  const overrides = recurringSeriesIds.length > 0
    ? await Event.find({
        recurringEventId: { $in: recurringSeriesIds },
        startDate: { $lte: end },
        endDate: { $gte: start }
      }).populate('createdBy', 'login email')
        .populate('participants.user', 'login email')
        .populate({
          path: 'tags',
          match: { userId: userId }
        })
    : [];

  const overridesBySeries = groupOverrides(overrides);
  const eventsByCalendarId = {};

  rawEvents.forEach(event => {
    const calendarId = event.calendarId.toString();
    if (!eventsByCalendarId[calendarId]) {
      eventsByCalendarId[calendarId] = [];
    }
    const eventOverrides = overridesBySeries.get(event._id.toString()) || [];
    const occurrences = expandEvent(event, start, end, eventOverrides);
    eventsByCalendarId[calendarId].push(...occurrences);
  });

  return eventsByCalendarId;
};

const getInvitedEvents = async (calendarIds, start, end, userId) => {
  const eventQuery = {
    calendarId: { $nin: calendarIds },
    recurringEventId: { $in: [null] },
    participants: {
      $elemMatch: {
        user: userId,
        status: 'accepted'
      }
    },
    $or: [
      {
        'recurrence.frequency': 'none',
        startDate: { $lte: end },
        endDate: { $gte: start }
      },
      {
        'recurrence.frequency': {
          $in: ['daily', 'weekly', 'monthly', 'yearly']
        },
        startDate: { $lte: end },
        $or: [
          { 'recurrence.until': { $exists: false } },
          { 'recurrence.until': null },
          { 'recurrence.until': { $gte: start } }
        ]
      }
    ]
  };

  const rawEvents = await Event.find(eventQuery)
  .populate('createdBy', 'login email')
  .populate('participants.user', 'login email')
  .populate('calendarId', 'name')
  .populate({
    path: 'tags',
    match: { userId: userId }
  });

  const recurringSeriesIds = rawEvents
    .filter(e => e.recurrence && e.recurrence.frequency !== 'none')
    .map(e => e._id);

  const overrides = recurringSeriesIds.length > 0
    ? await Event.find({
        recurringEventId: { $in: recurringSeriesIds },
        startDate: { $lte: end },
        endDate: { $gte: start }
      }).populate('createdBy', 'login email')
        .populate('participants.user', 'login email')
        .populate('calendarId', 'name')
        .populate({
          path: 'tags',
          match: { userId: userId }
        })
    : [];

  const overridesBySeries = groupOverrides(overrides);
  const events = [];

  rawEvents.forEach(event => {
    const eventOverrides = overridesBySeries.get(event._id.toString()) || [];
    events.push(...expandEvent(event, start, end, eventOverrides));
  });

  return events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
};

const updateEventFields = async (doc, fields, userId, isCreate = false, defaultColor = '') => {
  const {
    name, description, type, startDate, endDate,
    isAllDay, isCompleted, location, color, tags, recurrence,
    notificationChannel, reminderMinutesBefore
  } = fields;

  if (isCreate && (!name || !isNameValid(name))) {
    return {
      error: {
        status: 400,
        message: 'Name is required and must be 1-200 characters long.'
      }
    };
  }
  if (isCreate && !type) {
    return { error: { status: 400, message: 'Type is required.' } };
  }
  if (isCreate && !startDate) {
    return { error: { status: 400, message: "'startDate' is required." } };
  }

  if (name !== undefined) {
    if (!isNameValid(name)) {
      return {
        error: { status: 400, message: 'Name must be 1-200 characters long.' }
      };
    }
    doc.name = name;
  }
  if (description !== undefined) {
    if (description !== '' && !isDescriptionValid(description)) {
      return { error: { status: 400, message: 'Description must not be empty.' } };
    }
    doc.description = description;
  }
  if (type !== undefined) {
    if (!isTypeValid(type)) {
      return {
        error: {
          status: 400,
          message: "Type must be 'arrangement', 'reminder' or 'task'."
        }
      };
    }
    doc.type = type;
  }

  const currentType = type !== undefined ? type : doc.type;

  if (isAllDay !== undefined) {
    if (typeof isAllDay !== 'boolean') {
      return { error: { status: 400, message: "'isAllDay' must be boolean." } };
    }
    doc.isAllDay = isAllDay;
  }
  if (isCompleted !== undefined) {
    if (typeof isCompleted !== 'boolean') {
      return {
        error: { status: 400, message: "'isCompleted' must be boolean." }
      };
    }
    if (currentType !== 'task') {
      return {
        error: {
          status: 400,
          message: "Only events of type 'task' can be marked as completed."
        }
      };
    }
    doc.isCompleted = isCompleted;
  }
  if (location !== undefined) {
    if (location !== '' && !isDescriptionValid(location)) {
      return { error: { status: 400, message: 'Location must not be empty.' } };
    }
    doc.location = location;
  }
  if (color !== undefined) {
    if (!isColorValid(color)) {
      return { error: { status: 400, message: 'Invalid color format.' } };
    }
    doc.color = color;
  } else if (isCreate) {
    doc.color = defaultColor;
  }
  if (reminderMinutesBefore !== undefined) {
    if (!Number.isInteger(reminderMinutesBefore) || reminderMinutesBefore < 0) {
      return {
        error: {
          status: 400,
          message: "'reminderMinutesBefore' must be an integer greater than or equal to 0"
        }
      };
    }
    doc.reminderMinutesBefore = reminderMinutesBefore;
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
          userId: userId,
          name: { $in: tagNames }
        });
        if (existing.length !== tagNames.length) {
          return {
            error: {
              status: 400,
              message: 'One or more specified tags do not exist or do not belong to you.'
            }
          };
        }
        tagIds = existing.map(tag => tag._id);
      }
    }
    doc.tags = tagIds;
  }
  if (startDate !== undefined) {
    const parsedStart = new Date(startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      return { error: { status: 400, message: "Invalid 'startDate' format." } };
    }
    doc.startDate = parsedStart;
  }
  if (endDate !== undefined) {
    if (endDate === null) {
      doc.endDate = currentType === 'arrangement'
        ? new Date(new Date(doc.startDate).getTime() + 60 * 60 * 1000)
        : new Date(doc.startDate);
    } else {
      const parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        return { error: { status: 400, message: "Invalid 'endDate' format." } };
      }
      doc.endDate = parsedEnd;
    }
  } else if (isCreate && doc.startDate && !doc.endDate) {
    doc.endDate = currentType === 'arrangement'
      ? new Date(new Date(doc.startDate).getTime() + 60 * 60 * 1000)
      : new Date(doc.startDate);
  }
  if (doc.startDate && doc.endDate
      && new Date(doc.startDate) > new Date(doc.endDate)) {
    return {
      error: {
        status: 400,
        message: "'startDate' cannot be later than 'endDate'."
      }
    };
  }
  if (recurrence !== undefined) {
    const validateRes = validateRecurrence(recurrence, new Date(doc.startDate));
    if (!validateRes.isValid) {
      return { error: { status: 400, message: validateRes.message } };
    }
    doc.recurrence = recurrence;
  }

  let channel = notificationChannel !== undefined
    ? notificationChannel
    : doc.notificationChannel;

  if (currentType === 'arrangement') {
    channel = 'in-app';
  } else if (currentType === 'reminder' && !isChannelValid(channel)) {
    channel = 'email';
  } else if (currentType === 'task') {
    channel = channel || 'none';
  }
  doc.notificationChannel = channel;

  return { ok: true };
};

const scheduleEventReminder = async (doc) => {
  await agenda.cancel({ 'data.event_id': doc._id.toString() });
  if (!doc.isNotified && doc.notificationChannel !== 'none') {
    const minutesBefore = doc.type === 'reminder'
      ? 0 : (doc.reminderMinutesBefore || 0)
    const reminderTime = new Date(
      new Date(doc.startDate).getTime() - (minutesBefore * 60 * 1000)
    );
    if (reminderTime > new Date()) {
      await agenda.schedule(reminderTime, 'send-event-reminder', {
        event_id: doc._id.toString()
      });
    }
  }
};

module.exports = {
  getEventsForCalendars,
  getInvitedEvents,
  updateEventFields,
  scheduleEventReminder
};