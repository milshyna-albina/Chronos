const { Agenda } = require('agenda');
const { MongoBackend } = require('@agendajs/mongo-backend');
const Event = require('../models/Event');
const { sseService } = require('../services/sseService');

const agenda = new Agenda({
  backend: new MongoBackend({
    address: process.env.MONGO_URI,
    collection: 'agendaJobs'
  }),
  processEvery: '30 seconds'
});

agenda.define('send-event-reminder', async (job) => {
  try {
    const { event_id } = job.attrs.data;
    const event = await Event.findById(event_id)
      .populate('createdBy', 'login email')
      .populate({
        path: 'calendarId',
        populate: [
          { path: 'owner', select: 'login email' },
          { path: 'sharedWith.user', select: 'login email' },
        ]
      });

    if (!event || event.isNotified || event.notificationChannel === 'none') {
      return;
    }

    const recipientsMap = new Map();

    if (event.createdBy) {
      recipientsMap.set(event.createdBy._id.toString(), event.createdBy);
    }
    if (event.calendarId) {
      const calendar = event.calendarId;
      if (calendar.owner) {
        recipientsMap.set(calendar.owner._id.toString(), calendar.owner);
      }
      if (calendar.sharedWith && Array.isArray(calendar.sharedWith)) {
        calendar.sharedWith.forEach(item => {
          if (item.user) {
            recipientsMap.set(item.user._id.toString(), item.user);
          }
        });
      }
    }
    if (event.participants && Array.isArray(event.participants)) {
      event.participants.forEach(item => {
        if (item.user) {
          recipientsMap.set(item.user._id.toString(), item.user);
        }
      });
    }

    const recipients = Array.from(recipientsMap.values());
    for (const r of recipients) {
      if (event.notificationChannel === 'email' || event.notificationChannel === 'both') {
        //send email
        console.log(`Email sent to ${r.email}`);
      }

      if (event.notificationChannel === 'in-app'
        || event.notificationChannel === 'both'
        || event.type === 'arrangement') {
        sseService.sendToUser(r._id.toString(), {
          type: 'REMINDER',
          message: `Event reminder: ${event.name}`,
          event: event
        });
      }
    }
    event.isNotified = true;
    await event.save();
  } catch (error) {
    console.error('Agenda error:', error.message);
  }
});

(async () => {
  await agenda.start();
  console.log('Agenda worker started successfully.');
})();

module.exports = agenda;