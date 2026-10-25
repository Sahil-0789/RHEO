/**
 * RHEO — Client Error Utilities
 * Ensures raw database errors, Prisma traces, or technical jargon
 * are sanitized into friendly, actionable user messages.
 */

export function formatErrorMessage(err, defaultFallback = 'An unexpected error occurred. Please try again.') {
  if (!err) return defaultFallback;

  let raw = '';
  if (typeof err === 'string') {
    raw = err;
  } else if (err.response?.data?.message) {
    raw = err.response.data.message;
  } else if (err.message) {
    raw = err.message;
  }

  if (!raw || typeof raw !== 'string') {
    return defaultFallback;
  }

  const lower = raw.toLowerCase();

  // 1. Prisma & Database leaks
  if (
    lower.includes('prisma') ||
    lower.includes('postgres') ||
    lower.includes('unique constraint') ||
    lower.includes('p2002') ||
    lower.includes('p2025') ||
    lower.includes('p2003') ||
    lower.includes('invocation') ||
    lower.includes('database') ||
    lower.includes('neon.tech') ||
    lower.includes('foreign key') ||
    lower.includes('table ') ||
    lower.includes('column ') ||
    lower.includes('violates')
  ) {
    if (lower.includes('username') || lower.includes('duplicate_username')) {
      return 'This username is already taken. Please choose another.';
    }
    if (lower.includes('email') || lower.includes('duplicate_email')) {
      return 'An account with this email already exists.';
    }
    return 'Database service temporarily unavailable. Please try again shortly.';
  }

  // 2. Network & Server connection errors
  if (
    lower.includes('network error') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('failed to fetch') ||
    lower.includes('cors')
  ) {
    return 'Unable to reach the server. Please check your internet connection.';
  }

  // 3. Authentication & JWT errors
  if (lower.includes('jwt') || lower.includes('token') || lower.includes('unauthorized')) {
    return 'Session expired or invalid. Please sign in again.';
  }

  // 4. Clean human-readable message
  return raw.trim();
}
