const Event = require('../models/Event');
const Calendar = require('../models/Calendar');
const { expandEvent } = require('./eventService');

async function getUserCalendars(userId) {
  const calendars = await Calendar.find({
    $or: [
      { owner: userId },
      {
        sharedWith: {
          $elemMatch: {
            user: userId,
            status: 'accepted'
          }
        }
      }
    ]
  }, '_id name color');

  return {
    calendarIds: calendars.map(c => c._id.toString()),
    calendarsMap: new Map(calendars.map(c => [c._id.toString(), c]))
  };
}

const searchUserEvents = async (userId, query, limit = 10) => {
  const trimmed = String(query || '').trim();
  if (!trimmed) {
    return [];
  }
  const regex = new RegExp(String(trimmed).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const { calendarIds, calendarsMap } = await getUserCalendars(userId);

  const matchedRawEvents = await Event.find({
    $and: [
      { recurringEventId: null },
      {
        $or: [
          { calendarId: { $in: calendarIds } },
          {
            calendarId: { $nin: calendarIds },
            participants: {
              $elemMatch: {
                user: userId,
                status: 'accepted'
              }
            }
          }
        ]
      },
      {
        $or: [
          { name: regex },
          { description: regex },
          { location: regex }
        ]
      }
    ]
  })
    .populate('calendarId', 'name color')
    .limit(limit * 2);

  const matchedOverrides = await Event.find({
    $and: [
      { recurringEventId: { $ne: null } },
      {
        $or: [
          { calendarId: { $in: calendarIds } },
          {
            calendarId: { $nin: calendarIds },
            participants: {
              $elemMatch: {
                user: userId,
                status: 'accepted'
              }
            }
          }
        ]
      },
      {
        $or: [
          { name: regex },
          { description: regex },
          { location: regex }
        ]
      }
    ]
  })
    .populate('calendarId', 'name color')
    .limit(limit * 2);

  const parentIdsFromOverrides = [
    ...new Set(matchedOverrides.map(ov => ov.recurringEventId?.toString()).filter(Boolean))
  ];
  const parentSeriesDocs = parentIdsFromOverrides.length > 0
    ? await Event.find({ _id: { $in: parentIdsFromOverrides } })
      .populate('calendarId', 'name color')
    : [];
  const parentSeriesMap = new Map(parentSeriesDocs.map(doc => [doc._id.toString(), doc]));
  const recurringIds = matchedRawEvents
    .filter(e => e.recurrence && e.recurrence.frequency !== 'none')
    .map(e => e._id);
  const seriesOverrides = recurringIds.length > 0
    ? await Event.find({ recurringEventId: { $in: recurringIds } })
    : [];
  const overridesBySeries = new Map();
  seriesOverrides.forEach(ov => {
    const key = ov.recurringEventId.toString();
    if (!overridesBySeries.has(key)) {
      overridesBySeries.set(key, []);
    }
    overridesBySeries.get(key).push(ov);
  });

  const results = [];
  const seenKeys = new Set();
  const now = new Date();
  const repeatStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const repeatEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const doc of matchedRawEvents) {
    const calendarInfo = typeof doc.calendarId === 'object' && doc.calendarId !== null
      ? doc.calendarId
      : calendarsMap.get(doc.calendarId?.toString()) || null;

    const isRecurring = doc.recurrence && doc.recurrence.frequency !== 'none';
    if (!isRecurring) {
      const key = `single_${doc._id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push({
          ...doc.toJSON(),
          calendarId: calendarInfo ? calendarInfo._id.toString() : doc.calendarId.toString(),
          calendarName: calendarInfo?.name || 'Shared Event',
          calendarColor: calendarInfo.color || doc.color || '#dfc1cc',
          isRecurring: false,
          isOverride: false
        });
      }
      continue;
    }
    const occs = expandEvent(
      doc,
      repeatStart,
      repeatEnd,
      overridesBySeries.get(doc._id.toString()) || []
    );
    const chosenOcc = occs.find(occ => new Date(occ.endDate) >= now) ||
      occs[occs.length - 1] || doc;

    const key = `series_${doc._id}_${new Date(chosenOcc.startDate).toISOString()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push({
        ...chosenOcc.toJSON(),
        seriesId: doc._id.toString(),
        calendarId: calendarInfo ? calendarInfo._id.toString() : doc.calendarId.toString(),
        calendarName: calendarInfo?.name || 'Shared Event',
        calendarColor: calendarInfo.color || chosenOcc.color || '#dfc1cc',
        isRecurring: true
      });
    }
  }

  for (const ov of matchedOverrides) {
    const parent = parentSeriesMap.get(ov.recurringEventId.toString());
    const isExcluded = (parent?.exdates || []).some(
      d => new Date(d).getTime() === new Date(ov.originalStartDate).getTime()
    );
    if (isExcluded) {
      continue;
    }
    const calInfo =  typeof ov.calendarId === 'object' && ov.calendarId !== null
      ? ov.calendarId
      : calendarsMap.get(ov.calendarId?.toString()) || null;
    const key = `override_${ov._id}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push({
        ...ov.toJSON(),
        seriesId: ov.recurringEventId.toString(),
        calendarId: calInfo ? calInfo._id.toString() : ov.calendarId.toString(),
        calendarName: calInfo?.name || 'Shared Event',
        calendarColor: calInfo.color || ov.color || '#dfc1cc',
        isRecurring: true,
        isOverride: true
      });
    }
  }

  return results.slice(0, limit);
};

module.exports =  { searchUserEvents };