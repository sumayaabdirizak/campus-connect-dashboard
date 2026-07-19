/**
 * Clubs feature — core service module.
 *
 * Two creation paths:
 *   • Path A (student-initiated): createClubApplication() →
 *       Club row at status=PENDING, no DiscussionGroup yet. Dean later calls
 *       approveClubApplication() to materialise the server.
 *   • Path B (dean-initiated): createClubAsDean() →
 *       Club + DiscussionGroup + #general + system roles + owner + moderators
 *       in a single transaction; status starts APPROVED.
 *
 * Both paths share provisionClubServer() so a club is shaped the same way
 * regardless of who created it.
 */
export {
  ClubServiceError,
  validateSlug,
  provisionClubServer,
  createClubApplication,
  approveClubApplication,
  rejectClubApplication,
  createClubAsDean,
  getClubBySlug,
  listClubsForUser,
} from './club-service/index.js';
