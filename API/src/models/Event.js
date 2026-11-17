const mongoose = require('mongoose');

const recurrenceSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'none'
  },
  interval: {
    type: Number,
    default: 1
  },
  daysOfWeek: [{
    type: Number
  }],
  until: {
    type: Date
  }
}, { _id: false });

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['editor', 'viewer'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'pending'
  },
  expiresAt: {
    type: Date
  }
}, { timestamps: true, _id: false });

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxLength: 200,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  calendarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Calendar',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['arrangement', 'reminder', 'task'],
    default: 'arrangement',
    index: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  color: {
    type: String,
    default: ''
  },
  isNotified: {
    type: Boolean,
    default: false
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  notificationChannel: {
    type: String,
    enum: ['none', 'email', 'in-app', 'both'],
    default: 'in-app'
  },
  reminderMinutesBefore: {
    type: Number,
    default: 15
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  recurrence: {
    type: recurrenceSchema,
    default: () => ({ frequency: 'none' })
  },
  isPublicEnabled: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  publicRole: {
    type: String,
    enum: ['editor', 'viewer'],
    default: 'viewer'
  },
  participants: [participantSchema]
}, { timestamps: true });

eventSchema.index({ calendarId: 1, startDate: 1, endDate: 1 });
eventSchema.index({ tags: 1 });

eventSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('Event', eventSchema);