/**
 * DropShare — Centralized Error Handler Middleware
 */

'use strict';

const { HTTP_STATUS } = require('../constants');
const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * Express error handler — must be registered LAST with app.use().
 * All errors thrown or passed to next(err) arrive here.
 */
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    error: err.message,
    name: err.name,
    code: err.code,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  let statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_ERROR;
  let userMessage = err.message || 'An unexpected error occurred. Please try again.';

  // 1. Prisma & Database Error Sanitization
  if (
    err.name === 'PrismaClientKnownRequestError' ||
    err.constructor?.name === 'PrismaClientKnownRequestError' ||
    err.code?.startsWith?.('P')
  ) {
    if (err.code === 'P2002') {
      statusCode = HTTP_STATUS.CONFLICT;
      const target = err.meta?.target;
      const targetStr = Array.isArray(target) ? target.join(' ') : String(target || '');
      if (targetStr.includes('username')) {
        userMessage = 'This username is already taken. Please choose a different username.';
      } else if (targetStr.includes('email')) {
        userMessage = 'An account with this email address already exists.';
      } else {
        userMessage = 'An account or record with this information already exists.';
      }
    } else if (err.code === 'P2025') {
      statusCode = HTTP_STATUS.NOT_FOUND;
      userMessage = 'The requested item was not found.';
    } else if (err.code === 'P2003') {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      userMessage = 'Action cannot be completed because related items depend on it.';
    } else {
      statusCode = HTTP_STATUS.INTERNAL_ERROR;
      userMessage = 'A database service error occurred. Please try again shortly.';
    }
  } else if (
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    err.name === 'PrismaClientValidationError'
  ) {
    statusCode = err.name === 'PrismaClientValidationError'
      ? HTTP_STATUS.BAD_REQUEST
      : HTTP_STATUS.SERVICE_UNAVAILABLE;
    userMessage = err.name === 'PrismaClientValidationError'
      ? 'Invalid data format provided.'
      : 'Database service is temporarily unavailable. Please try again in a moment.';
  }

  // 2. Authentication & JWT Token Errors
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    userMessage = err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please sign in again.'
      : 'Invalid session token. Please sign in again.';
  }

  // 3. Network / Connection Errors
  else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
    userMessage = 'Unable to reach backend services. Please check your network connection.';
  }

  // 4. Request Parsing Errors
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    userMessage = 'Invalid JSON payload received.';
  }

  // 5. Catch-all safety filter for any raw database/driver strings
  else if (typeof userMessage === 'string') {
    const lower = userMessage.toLowerCase();
    if (
      lower.includes('prisma') ||
      lower.includes('postgres') ||
      lower.includes('select ') ||
      lower.includes('insert ') ||
      lower.includes('update ') ||
      lower.includes('relation ') ||
      lower.includes('table ') ||
      lower.includes('column ') ||
      lower.includes('violates') ||
      lower.includes('foreign key') ||
      lower.includes('unique constraint') ||
      lower.includes('neon.tech') ||
      lower.includes('invocation')
    ) {
      statusCode = HTTP_STATUS.INTERNAL_ERROR;
      userMessage = 'A temporary database error occurred. Please try again.';
    }
  }

  const response = {
    success: false,
    message: userMessage,
  };

  res.status(statusCode).json(response);
}

/**
 * Handle 404 routes — must be registered before errorHandler.
 */
function notFoundHandler(req, res) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
