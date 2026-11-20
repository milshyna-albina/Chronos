const { RRule } = require('rrule');
const Event = require('../models/Event');
const Tag = require('../models/Tag');

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

function expandEvent(eventDoc, start, end) {
  const event = eventDoc.toJSON() ? eventDoc.toJSON() : { ...eventDoc };

  if (Array.isArray(event.tags)) {
    event.tags = event.tags.filter(tag => tag !== null);
  }

  const hasRecurrence = event.recurrence && event.recurrence.frequency !== 'none';

  if (!hasRecurrence) {
    if (new Date(event.startDate) <= end && new Date(event.endDate) >= start) {
      return [{ ...event, isRecurring: false}];
    }
    return [];
  }

  const rule = buildRule(event);
  const duration = new Date(event.endDate).getTime() - new Date(event.startDate).getTime();
  const queryStart = new Date(Math.max(0, start.getTime() - duration));
  const occurrences = rule.between(queryStart, end, true);

  const result = [];
  for (const occStart of occurrences) {
    const occEnd = new Date(occStart.getTime() + duration);
    if (occStart <= end && occEnd >= start) {
      result.push({
        ...event,
        startDate: occStart,
        endDate: occEnd,
        isRecurring: true
      });
    }
  }

  return result;
}

const getEventsForCalendars = async (calendarIds, start, end, userId) => {
  if (!Array.isArray(calendarIds) || calendarIds.length === 0) {
    return {};
  }

  const eventQuery = {
    calendarId: { $in: calendarIds },
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

  const eventsByCalendarId = {};

  rawEvents.forEach(event => {
    const calendarId = event.calendarId.toString();
    if (!eventsByCalendarId[calendarId]) {
      eventsByCalendarId[calendarId] = [];
    }
    const occurrences = expandEvent(event, start, end);
    eventsByCalendarId[calendarId].push(...occurrences);
  });

  return eventsByCalendarId;
};

const getInvitedEvents = async (calendarIds, start, end, userId) => {
  const eventQuery = {
    calendarId: { $nin: calendarIds },
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

  const events = [];
  for (const event of rawEvents) {
    events.push(...expandEvent(event, start, end));
  }

  return events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
};

module.exports = {
  getEventsForCalendars,
  getInvitedEvents
};