const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    lowercase: true,
    maxLength: 50,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  color: {
    type: String,
    default: '#56a37b'
  }
}, { timestamps: true });

tagSchema.index({ userId: 1, name: 1 }, { unique: true });

tagSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('Tag', tagSchema);