/**
 * Per-club system-role seeder.
 *
 * On club approval (Path A) or dean direct-create (Path B), we provision a
 * fresh DiscussionGroup and call `seedClubSystemRoles(tx, serverId)` to insert
 * three DiscussionRole rows with `isSystem=true`. These rows participate in
 * the permission engine the same way faculty-server system roles do — see
 * `computeChannelPermissions` in `features/discussions/permissions.js`.
 *
 * Role mapping at runtime (set in club.service.js + permissions.js):
 *   - OWNER     → not a DiscussionRole row; resolved via DiscussionGroup.ownerId
 *                  short-circuit at permissions.js:202 → PERMISSION_ALL.
 *   - MODERATOR → systemKey 'MODERATOR'; membership.role='MODERATOR' resolves
 *                  to this row when the engine sees `kind='USER_SERVER'`.
 *   - MEMBER    → systemKey 'MEMBER'; membership.role='MEMBER'.
 *   - EVERYONE  → applied as the baseline before role-OR-in.
 *
 * Permission masks here intentionally align with the spec: a MODERATOR can
 * moderate the chat (manage messages, pin, mute, kick) but cannot change the
 * server's identity (rename, archive, manage roles); the OWNER does that.
 */

import { PERMISSION_BITS } from '../discussions/permissions.js';

const B = PERMISSION_BITS;

/** System-role keys used inside a club server. Must match the `systemKey`
 *  column values in the DiscussionRole rows inserted by this helper. */
export const CLUB_SYSTEM_ROLE_KEYS = Object.freeze({
  EVERYONE: 'EVERYONE',
  MEMBER: 'MEMBER',
  MODERATOR: 'MODERATOR',
});

/** Read-only baseline: anyone on the server can see channels and history.
 *  Send permissions come from MEMBER (the next tier). */
const EVERYONE_MASK =
  B.VIEW_CHANNEL |
  B.READ_MESSAGE_HISTORY;

/** Regular club member — can chat, react, attach, start threads. */
const MEMBER_MASK =
  B.VIEW_CHANNEL |
  B.READ_MESSAGE_HISTORY |
  B.SEND_MESSAGES |
  B.SEND_MESSAGES_IN_THREADS |
  B.ATTACH_FILES |
  B.EMBED_LINKS |
  B.ADD_REACTIONS |
  B.USE_EXTERNAL_EMOJI |
  B.CREATE_THREADS;

/** Moderator — member powers + chat moderation. Crucially does NOT include
 *  MANAGE_CHANNEL or MANAGE_ROLES; those stay with the OWNER. */
const MODERATOR_MASK =
  MEMBER_MASK |
  B.MANAGE_MESSAGES |
  B.MANAGE_THREADS |
  B.PIN_MESSAGES |
  B.MENTION_EVERYONE |
  B.MUTE_MEMBERS |
  B.MODERATE_MEMBERS |
  B.KICK_MEMBERS |
  B.VIEW_AUDIT_LOG;

export const CLUB_SYSTEM_ROLE_DEFAULTS = Object.freeze({
  [CLUB_SYSTEM_ROLE_KEYS.EVERYONE]: EVERYONE_MASK,
  [CLUB_SYSTEM_ROLE_KEYS.MEMBER]: MEMBER_MASK,
  [CLUB_SYSTEM_ROLE_KEYS.MODERATOR]: MODERATOR_MASK,
});

/**
 * Insert the three system roles (EVERYONE / MEMBER / MODERATOR) on a freshly
 * provisioned club server. Idempotent — re-runs upsert by (serverId, systemKey).
 *
 * @param {object} tx — a Prisma transaction client (passed by club.service.js).
 * @param {number} serverId — the DiscussionGroup.id this club is mapped to.
 * @returns {Promise<{ everyoneRoleId: number, memberRoleId: number, moderatorRoleId: number }>}
 */
export async function seedClubSystemRoles(tx, serverId) {
  if (!serverId || !Number.isInteger(Number(serverId))) {
    throw new Error('seedClubSystemRoles: serverId is required');
  }

  // Position determines the role's stack order in the engine. EVERYONE at the
  // bottom, MODERATOR at the top. Matches Discord-style precedence: later
  // roles override earlier ones.
  const seeds = [
    {
      systemKey: CLUB_SYSTEM_ROLE_KEYS.EVERYONE,
      name: '@everyone',
      permissions: CLUB_SYSTEM_ROLE_DEFAULTS.EVERYONE,
      position: 0,
    },
    {
      systemKey: CLUB_SYSTEM_ROLE_KEYS.MEMBER,
      name: 'Member',
      permissions: CLUB_SYSTEM_ROLE_DEFAULTS.MEMBER,
      position: 1,
    },
    {
      systemKey: CLUB_SYSTEM_ROLE_KEYS.MODERATOR,
      name: 'Moderator',
      permissions: CLUB_SYSTEM_ROLE_DEFAULTS.MODERATOR,
      position: 2,
    },
  ];

  const result = {};
  for (const seed of seeds) {
    const row = await tx.discussionRole.upsert({
      where: {
        serverId_systemKey: { serverId: Number(serverId), systemKey: seed.systemKey },
      },
      update: {
        permissions: seed.permissions,
        // Don't overwrite a renamed role on re-run.
      },
      create: {
        serverId: Number(serverId),
        systemKey: seed.systemKey,
        name: seed.name,
        permissions: seed.permissions,
        position: seed.position,
        isSystem: true,
      },
      select: { id: true, systemKey: true },
    });
    if (row.systemKey === CLUB_SYSTEM_ROLE_KEYS.EVERYONE) result.everyoneRoleId = row.id;
    if (row.systemKey === CLUB_SYSTEM_ROLE_KEYS.MEMBER) result.memberRoleId = row.id;
    if (row.systemKey === CLUB_SYSTEM_ROLE_KEYS.MODERATOR) result.moderatorRoleId = row.id;
  }

  return result;
}
