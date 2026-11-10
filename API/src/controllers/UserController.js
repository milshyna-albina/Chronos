const path = require('path');
const User = require('../models/User');
const Token = require('../models/Token');
const Calendar = require('../models/Calendar');
const { isLoginValid, isEmailValid } = require('../utils/validator');
const { deleteFile } = require('../utils/fileHandling');

class UserController {
  async searchUsers(req, res) {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({
          message: 'Search query (email) is required.'
        });
      }

      const users = await User.find({
        email: { $regex: email, $options: 'i' },
        _id: { $ne: req.user._id }
      }).select('login email avatarPath').limit(10);

      res.status(200).json({
        users: users
      });
    } catch (error) {
      console.error('[UserController.getUserByEmail]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { user_id } = req.params;
      if (!user_id) {
        return res.status(400).json({
          message: 'Invalid user ID.'
        });
      }

      const user = await User.findById(user_id, 'login email avatarPath');
      if (!user) {
        return res.status(404).json({
          message: 'User not found.'
        });
      }

      res.status(200).json({
        user: user
      });
    } catch (error) {
      console.error('[UserController.getUserById]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'No file uploaded.'
        });
      }

      const avatarFilename = `avatars/${req.file.filename}`;

      const user = await User.findById(req.user._id);
      if (!user) {
        await deleteFile(req.file.path);
        return res.status(404).json({
          message: 'User not found.'
        });
      }

      if (user.avatarPath && user.avatarPath !== 'avatars/default.png') {
        const oldAvatar = path.join(__dirname, '..', '..', 'uploads', user.avatarPath);
        await deleteFile(oldAvatar);
      }

      user.avatarPath = avatarFilename;

      await user.save();

      res.status(200).json({
        message: 'Avatar uploaded successfully.',
        avatar: avatarFilename
      });
    } catch (error) {
      if (req.file) {
        await deleteFile(req.file.path);
      }
      console.error('[UserController.uploadAvatar]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { login, email } = req.body;

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          message: 'User not found.'
        });
      }

      if (login && login !== user.login) {
        if (!isLoginValid(login)) {
          return res.status(400).json({
            message: 'Login must be 3-30 alphanumeric characters.'
          });
        }
        const existing = await User.findOne({ login: login });
        if (existing) {
          return res.status(400).json({
            message: 'Login is already taken.'
          });
        }
        user.login = login;
      }

      if (email && email !== user.email) {
        if (!isEmailValid(email)) {
          return res.status(400).json({
            message: 'Invalid email format.'
          });
        }
        const existing = await User.findOne({ email: email });
        if (existing) {
          return res.status(400).json({
            message: 'Email is already taken.'
          });
        }
        user.email = email;
      }

      await user.save();

      res.status(200).json({
        message: 'Profile updated successfully.',
        user: {
          id: user._id,
          login: user.login,
          email: user.email,
          avatarPath: user.avatarPath
        }
      });
    } catch (error) {
      console.error('[UserController.updateUser]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          message: 'User not found.'
        });
      }

      const userCalendars = await Calendar.find({ owner: req.user._id });
      const calendarsIds = userCalendars.map(c => c._id);

      if (calendarsIds.length > 0) {
        //event
      }
      await Calendar.deleteMany({ owner: req.user._id });
      await Calendar.updateMany(
        { 'sharedWith.userId': req.user._id },
        { $pull: { sharedWith: { userId: req.user._id } } }
      );
      await Token.deleteMany({ userId: req.user._id });
      await User.findByIdAndDelete(req.user._id);

      if (user.avatarPath && user.avatarPath !== 'avatars/default.png') {
        const avatarPath = path.join(__dirname, '..', '..', 'uploads', user.avatarPath);
        await deleteFile(avatarPath);
      }

      res.clearCookie('token', { httpOnly: true });
      res.status(200).json({
        message: 'User account and all associated data deleted successfully.'
      });
    } catch (error) {
      console.error('[UserController.deleteUser]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new UserController();