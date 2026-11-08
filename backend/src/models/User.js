const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  login: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);