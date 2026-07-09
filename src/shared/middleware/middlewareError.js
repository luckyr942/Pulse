const logger = require('../../config/logger');
const { HTTP_STATUS } = require('../constants/messageStatus');

const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';

  // Log full error stacks for trace details
  logger.error(`${err.message} - Path: ${req.originalUrl} - Method: ${req.method}`, err.stack);

  // Duplicate key (username already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      status: 'fail',
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`
    });
  }

  // Schema validations
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(el => el.message);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      status: 'fail',
      message: `Invalid input: ${messages.join(', ')}`
    });
  }

  // Token errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      status: 'fail',
      message: 'Invalid authorization token.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      status: 'fail',
      message: 'Session has expired. Please log in again.'
    });
  }

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorMiddleware;
