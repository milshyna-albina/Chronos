const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  isLoginValid,
  isEmailValid,
  isPasswordValid
} = require('../utils/validator');

class AuthController {
  async register(req, res) {
    try {
      const { login, email, password, password_confirmation } = req.body;

      if (!login) {
        return res.status(400).json({
          message: 'Login is required.'
        });
      }
      if (!email) {
        return res.status(400).json({
          message: 'Email is required.'
        });
      }
      if (!password) {
        return res.status(400).json({
          message: 'Password is required.'
        });
      }
      if (password !== password_confirmation) {
        return res.status(400).json({
          message: 'Passwords do not match.'
        });
      }
      if (!isLoginValid(login)) {
        return res.status(400).json({
          message: 'Login must be 3-30 alphanumeric characters.'
        });
      }
      if (!isEmailValid(email)) {
        return res.status(400).json({
          message: 'Invalid email format.'
        });
      }
      if (!isPasswordValid(password)) {
        return res.status(400).json({
          message: 'Password must be at least 8 characters long and contain at' +
            'least one uppercase letter and at least one digit.'
        });
      }
      if (await User.exists({ login: login })) {
        return res.status(400).json({
          message: 'User with this login already exists.'
        });
      }
      if (await User.exists({ email: email })) {
        return res.status(400).json({
          message: 'Email is already taken.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        login,
        email,
        passwordHash: hashedPassword,
        isVerified: false
      });

      res.status(201).json({
        message: 'User registered successfully.',
        user: {
          id: newUser._id,
          login: newUser.login,
          email: newUser.email
        }
      });
    } catch (error) {
      console.error('[AuthController.register]:', error);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async login(req, res) {
    try {
      const { identifier, password } = req.body;

      if (!identifier) {
        return res.status(400).json({
          message: 'Identifier (login/email) is required.'
        });
      }

      if (!password) {
        return res.status(400).json({
          message: 'Password required.'
        });
      }

      const user = await User.findOne({
        $or: [
          { login: identifier },
          { email: identifier }
        ]
      });

      if (!user) {
        return res.status(401).json({
          message: 'Invalid credentials.'
        });
      }

      const isRightPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isRightPassword) {
        return res.status(401).json({
          message: 'Invalid credentials.'
        });
      }

      if (!user.isVerified) {
        return res.status(403).json({
          message: 'Please confirm your email first.'
        });
      }

      const jwToken = jwt.sign(
        { id: user._id, login: user.login, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.cookie('token', jwToken, { httpOnly: true });

      res.status(200).json({
        message: 'User logged in successfully.',
        user: {
          id: user._id,
          login: user.login,
          email: user.email
        }
      });
    } catch (error) {
      console.error('[AuthController.login]:', error);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async logout(req, res) {
    try {
      res.clearCookie('token', { httpOnly: true });
      res.status(200).json({
        message: 'Logged out successfully.'
      });
    } catch (error) {
      console.error('[AuthController.logout] Error:', error);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new AuthController();