const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Token = require('../models/Token');
const {
  isLoginValid,
  isEmailValid,
  isPasswordValid
} = require('../utils/validator');
const {
  sendConfirmationEmail,
  sendResetPasswordEmail
} = require('../utils/mail');

class AuthController {
  async register(req, res) {
    let newUser = null;

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
            ' least one uppercase letter and at least one digit.'
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

      newUser = await User.create({
        login,
        email,
        passwordHash: hashedPassword,
        isVerified: false
      });

      const code = crypto.randomInt(100000, 1000000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await Token.create({
        userId: newUser._id,
        token: codeHash,
        type: 'email',
        expiresAt: expiresAt
      });

      await sendConfirmationEmail(email, code);

      res.status(201).json({
        message: 'User registered successfully. ' +
                 'Please check your email to verified your account.',
        userId: newUser._id
      });
    } catch (error) {
      console.error('[AuthController.register]:', error.message);
      if (newUser && newUser._id) {
        try {
          await User.findByIdAndDelete(newUser._id);
          await Token.deleteMany({ userId: newUser._id });
          console.log(`[Rollback]: User ${newUser._id} was deleted due to email sending failure.`);
        } catch (mailError) {
          console.error('[Rollback Error]: Failed to clean up user:', mailError.message);
        }
      }
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
          message: 'Identifier (login / email) is required.'
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
      console.error('[AuthController.login]:', error.message);
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
      console.error('[AuthController.logout]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async confirmEmail(req, res) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          message: 'Code is required.'
        });
      }

      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      const tokenRecord = await Token.findOne({
        token: codeHash,
        type: 'email'
      });
      if (!tokenRecord) {
        return res.status(400).json({
          message: 'Invalid or expired code.'
        });
      }

      await User.findByIdAndUpdate(tokenRecord.userId, { isVerified: true });
      await Token.findByIdAndDelete(tokenRecord._id);

      res.status(200).json({
        message: 'Email confirmed successfully.'
      });
    } catch (error) {
      console.error('[AuthController.confirmEmail]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async resendConfirmationCode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: 'Email is required.'
        });
      }
      if (!isEmailValid(email)) {
        return res.status(400).json({
          message: 'Invalid email format.'
        });
      }

      const user = await User.findOne({ email: email });
      if (!user) {
        return res.status(200).json({
          message: 'If a user with this email exists, a confirm code has been sent.'
        });
      }
      if (user.isVerified) {
        return res.status(400).json({
          message: 'Email is already verified.'
        });
      }

      const code = crypto.randomInt(100000, 1000000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await Token.deleteMany({ userId: user._id, type: 'email' });

      await Token.create({
        userId: user._id,
        token: codeHash,
        type: 'email',
        expiresAt: expiresAt
      });

      await sendConfirmationEmail(email, code);

      res.status(200).json({
        message: 'A new confirmation code has been sent.'
      });
    } catch (error) {
      console.error('[AuthController.resendConfirmationCode]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async passwordResetRequest(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: 'Email is required.'
        });
      }
      if (!isEmailValid(email)) {
        return res.status(400).json({
          message: 'Invalid email format.'
        });
      }

      const user = await User.findOne({ email: email });
      if (!user) {
        return res.status(200).json({
          message: 'If a user with this email exists, a password reset link has been sent.'
        });
      }

      const token = crypto.randomUUID();
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

      await Token.deleteMany({ userId: user._id, type: 'password' });

      await Token.create({
        userId: user._id,
        token: tokenHash,
        type: 'password',
        expiresAt: expiresAt
      });

      await sendResetPasswordEmail(email, token);

      res.status(200).json({
        message: 'Password reset link has been sent.'
      });
    } catch (error) {
      console.error('[AuthController.passwordResetRequest]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async passwordResetConfirm(req, res) {
    try {
      const { token } = req.params;
      const { new_password } = req.body;

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const tokenRecord = await Token.findOne({
        token: tokenHash,
        type: 'password'
      });
      if (!tokenRecord) {
        return res.status(400).json({
          message: 'Invalid or expired token.'
        });
      }

      if (!new_password) {
        return res.status(400).json({
          message: 'New password is required.'
        });
      }
      if (!isPasswordValid(new_password)) {
        return res.status(400).json({
          message: 'Password must be at least 8 characters long and contain at' +
            ' least one uppercase letter and at least one digit.'
        });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);

      await User.findByIdAndUpdate(
        tokenRecord.userId,
        { passwordHash: hashedPassword }
      );
      await Token.findByIdAndDelete(tokenRecord._id);

      res.status(200).json({
        message: 'Password reset successfully.',
      });
    } catch (error) {
      console.error('[AuthController.passwordResetConfirm]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async checkStatus(req, res) {
    try {
      res.status(200).json({
        isAuthenticated: true,
        user: {
          id: req.user._id,
          login: req.user.login,
          email: req.user.email,
          isVerified: req.user.isVerified
        }
      });
    } catch (error) {
      console.error('[AuthController.checkStatus]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new AuthController();