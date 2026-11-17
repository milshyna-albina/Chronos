const canUserEditEvent = (userId, calendar, event) => {
  const isCalendarOwner = calendar.owner.toString() === userId.toString();
  const isCalendarEditor = calendar.sharedWith.some(
    m => m.user.toString() === userId.toString() && m.role === 'editor'
  );

  if (isCalendarOwner || isCalendarEditor) {
    return true;
  }

  const isEventCreator = event.createdBy.toString() === userId.toString();
  const isEventEditor = event.participants.some(
    m => m.user.toString() === userId.toString() && m.role === 'editor'
  );

  return isEventCreator || isEventEditor;
};

const canUserDeleteEvent = (userId, calendar, event) => {
  const isCalendarOwner = calendar.owner.toString() === userId.toString();
  const isEventCreator = event.createdBy.toString() === userId.toString();

  if (isCalendarOwner || isEventCreator) {
    return true;
  }

  const isCalendarEditor = calendar.sharedWith.some(
    m => m.user.toString() === userId.toString() && m.role === 'editor'
  );

  return Boolean(isCalendarEditor);
};

const canUserShareEvent = (userId, calendar, event) => {
  const isCalendarOwner = calendar.owner.toString() === userId.toString();
  const isEventCreator = event.createdBy.toString() === userId.toString();

  return isCalendarOwner || isEventCreator;
};

module.exports = {
  canUserEditEvent,
  canUserDeleteEvent,
  canUserShareEvent
};