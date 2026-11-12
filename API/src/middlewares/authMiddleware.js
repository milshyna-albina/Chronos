const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authorize = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({
        message: 'Token is missing.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      message: 'Token is invalid or expired.'
    });
  }
};

const softAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = { authorize, softAuth };