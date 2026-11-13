const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'password'],
    required: true
  },
  expiresAt: {
    type: Date,
    expires: 0,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Token', tokenSchema);