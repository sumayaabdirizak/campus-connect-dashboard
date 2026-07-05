/**
 * Notification/deadline kinds shared by the calendar feed
 * (backend/src/features/announcements/services/calendarDeadlines.service.js)
 * and the frontend notification feed (use-notification-feed.ts).
 * @type {readonly ['announcement', 'assignment', 'quiz']}
 */
export const NOTIF_TYPES = Object.freeze(['announcement', 'assignment', 'quiz']);

export const NOTIF_KIND = Object.freeze({
  ANNOUNCEMENT: 'announcement',
  ASSIGNMENT: 'assignment',
  QUIZ: 'quiz',
});

/** @typedef {typeof NOTIF_TYPES[number]} NotifType */

/**
 * @param {unknown} value
 * @returns {value is NotifType}
 */
export function isNotifType(value) {
  return typeof value === 'string' && NOTIF_TYPES.includes(value);
}
