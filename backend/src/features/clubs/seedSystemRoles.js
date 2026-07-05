import { PERMISSION_BITS } from "../discussions/permissions.js";

export const CLUB_SYSTEM_ROLE_KEYS = Object.freeze({
  EVERYONE: "EVERYONE",
  MEMBER: "MEMBER",
  MODERATOR: "MODERATOR",
});

const B = PERMISSION_BITS;

export const CLUB_SYSTEM_ROLE_DEFAULTS = Object.freeze({
  [CLUB_SYSTEM_ROLE_KEYS.EVERYONE]:
    B.VIEW_CHANNEL | B.READ_MESSAGE_HISTORY,
  [CLUB_SYSTEM_ROLE_KEYS.MEMBER]:
    B.VIEW_CHANNEL |
    B.READ_MESSAGE_HISTORY |
    B.SEND_MESSAGES |
    B.ATTACH_FILES |
    B.EMBED_LINKS |
    B.ADD_REACTIONS |
    B.USE_EXTERNAL_EMOJI |
    B.CREATE_THREADS |
    B.SEND_MESSAGES_IN_THREADS,
  [CLUB_SYSTEM_ROLE_KEYS.MODERATOR]:
    B.VIEW_CHANNEL |
    B.READ_MESSAGE_HISTORY |
    B.SEND_MESSAGES |
    B.ATTACH_FILES |
    B.EMBED_LINKS |
    B.ADD_REACTIONS |
    B.USE_EXTERNAL_EMOJI |
    B.CREATE_THREADS |
    B.SEND_MESSAGES_IN_THREADS |
    B.MANAGE_MESSAGES |
    B.MANAGE_THREADS |
    B.PIN_MESSAGES |
    B.MENTION_EVERYONE |
    B.KICK_MEMBERS |
    B.VIEW_AUDIT_LOG |
    B.MUTE_MEMBERS |
    B.MODERATE_MEMBERS,
});

const ROLE_ROWS = [
  {
    systemKey: CLUB_SYSTEM_ROLE_KEYS.EVERYONE,
    name: "Everyone",
    position: 0,
  },
  {
    systemKey: CLUB_SYSTEM_ROLE_KEYS.MEMBER,
    name: "Member",
    position: 10,
  },
  {
    systemKey: CLUB_SYSTEM_ROLE_KEYS.MODERATOR,
    name: "Moderator",
    position: 20,
  },
];

export async function seedClubSystemRoles(tx, serverId) {
  const sid = Number(serverId);
  if (!Number.isInteger(sid) || sid <= 0) {
    throw new Error("seedClubSystemRoles requires a valid serverId");
  }

  const roleIds = {};
  for (const row of ROLE_ROWS) {
    const role = await tx.discussionRole.upsert({
      where: {
        serverId_systemKey: {
          serverId: sid,
          systemKey: row.systemKey,
        },
      },
      update: {
        name: row.name,
        position: row.position,
        isSystem: true,
        permissions: CLUB_SYSTEM_ROLE_DEFAULTS[row.systemKey],
      },
      create: {
        serverId: sid,
        systemKey: row.systemKey,
        name: row.name,
        position: row.position,
        isSystem: true,
        permissions: CLUB_SYSTEM_ROLE_DEFAULTS[row.systemKey],
      },
      select: { id: true, systemKey: true },
    });
    roleIds[role.systemKey] = role.id;
  }

  return roleIds;
}
