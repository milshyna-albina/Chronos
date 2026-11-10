const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  login: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  avatarPath: {
    type: String,
    default: 'avatars/default.png'
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);