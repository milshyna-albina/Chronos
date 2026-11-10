const mongoose = require('mongoose');

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
  isNotified: {
    type: Boolean,
    default: false
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
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