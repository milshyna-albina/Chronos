const User = require('../models/User');

class AuthController {
  async register(req, res) {
    try {
      const newUser = await User.create({
        login: 'user1',
        email: 'user@gmail.com',
        passwordHash: 'qweqwe'
      });

      res.status(201).json({
        message: 'User registered successfully.',
        user: {
          login: 'user1',
          email: 'user@gmail.com',
          passwordHash: 'qweqwe'
        }
      });
    } catch (error) {
      console.error('[AuthController.register]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new AuthController();