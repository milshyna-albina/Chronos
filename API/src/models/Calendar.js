const mongoose = require('mongoose');

const sharedMemberSchema = new mongoose.Schema({
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
  isHidden: {
    type: Boolean,
    default: false
  }
});

sharedMemberSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

const calendarSchema = new mongoose.Schema({
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
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#dfc1cc'
  },
  sharedWith: [sharedMemberSchema]
}, { timestamps: true });

calendarSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('Calendar', calendarSchema);