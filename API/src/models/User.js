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
  },
  country: {
    type: String,
    default: 'UA',
    uppercase: true,
    trim: true
  }
}, { timestamps: true });

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('User', userSchema);