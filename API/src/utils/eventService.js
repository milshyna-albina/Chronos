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

const getEventsForCalendars = async (calendarIds, start, end, userId) => {
  const eventQuery = {
    calendarId: { $in: calendarIds },
    $or: [
      {
        startDate: { $lte: end }, // field: (less than or equal) value
        endDate: { $gte: start } // field: (greater than or equal) value
      }
    ]
  };

  const rawEvents = await Event.find(eventQuery)
    .populate('createdBy', 'login email')
    .populate({
      path: 'tags',
      match: { userId: userId }
    });
  const events = [];

  rawEvents.forEach(event => {
    event.tags = event.tags.filter(tag => tag !== null);

    if (!event.recurrence || event.recurrence.frequency === 'none') {
      if (event.startDate <= end && event.endDate >= start) {
        events.push(event.toJSON());
      }
      return;
    }

    const ruleOptions = {
      freq: FREQ_MAP[event.recurrence.frequency],
      interval: event.recurrence.interval || 1,
      dtstart: new Date(event.startDate),
      until: event.recurrence.until ? new Date(event.recurrence.until) : undefined
    };

    if (event.recurrence.daysOfWeek && event.recurrence.daysOfWeek.length > 0) {
      ruleOptions.byweekday = event.recurrence.daysOfWeek.map(d => DAY_MAP[d]);
    }

    const rule = new RRule(ruleOptions);
    const duration = new Date(event.endDate).getTime() - new Date(event.startDate).getTime();
    const occurrences = rule.between(start, end, true);

    occurrences.forEach(date => {
      const endDate = new Date(date.getTime() + duration);
      events.push({
        ...event.toJSON(),
        startDate: date,
        endDate: endDate,
        isRecurring: true
      });
    });
  });

  const eventsByCalendarId = {};

  events.forEach(event => {
    const calendarId = event.calendarId.toString();
    if (!eventsByCalendarId[calendarId]) {
      eventsByCalendarId[calendarId] = [];
    }
    eventsByCalendarId[calendarId].push(event);
  });

  return eventsByCalendarId;
};

module.exports = {
  getEventsForCalendars
};