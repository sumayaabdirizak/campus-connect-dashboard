import { AO_GROUP_MEMBER_ROLES } from '../../../features/discussions/assertAoDeanGroupMembers.js';
import { listUniversityRoleCandidates } from './listUniversityRoleCandidates.js';

/**
 * List active deans + office staff for Academic Office group-DM picker.
 * @param {number} excludeUserId
 * @param {string} q
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {object} userSelect
 */
export async function listDeanCandidatesForAo(excludeUserId, q, prismaClient, userSelect) {
  return listUniversityRoleCandidates(
    excludeUserId,
    q,
    AO_GROUP_MEMBER_ROLES,
    prismaClient,
    userSelect
  );
}
