/**
 * Hybrid Academic + Discord server hierarchy backfill service.
 *
 * Maps the existing one-DiscussionGroup-per-academic-scope world into the new
 * Discord-style world:
 *   - Faculty group  -> a server (kind=FACULTY_SERVER) with default categories,
 *                       channels (#general, #announcements), and system roles.
 *   - Department/Batch/Section group -> a DiscussionChannel inside the parent
 *                                       faculty server, in the right category.
 *   - DiscussionGroupMembership rows -> per-channel DiscussionPermissionOverwrite
 *                                        rows (member-level allow mask).
 *
 * Legacy `DiscussionGroup` rows are NOT deleted; they remain so older REST
 * paths keep working. Each new channel records its source group id via
 * `legacyGroupId` so we can dual-write/dual-read during the transition.
 */

import { prisma } from "../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES } from "./policy.js";
import {
  PERMISSION_BITS,
  PERMISSION_ADMINISTRATOR,
  SYSTEM_ROLE_DEFAULTS,
  SYSTEM_ROLE_KEYS,
} from "./permissions.js";

const B = PERMISSION_BITS;

/** Default per-member allow mask granted to every academic membership. */
export const MEMBER_ALLOW_MASK =
  B.VIEW_CHANNEL |
  B.READ_MESSAGE_HISTORY |
  B.SEND_MESSAGES |
  B.ATTACH_FILES |
  B.EMBED_LINKS |
  B.ADD_REACTIONS |
  B.USE_EXTERNAL_EMOJI |
  B.CREATE_THREADS |
  B.SEND_MESSAGES_IN_THREADS;

/** Bonus mask for staff (lecturer/dean/faculty admin) on top of MEMBER_ALLOW_MASK. */
export const STAFF_BONUS_MASK = B.MANAGE_MESSAGES | B.MANAGE_THREADS | B.PIN_MESSAGES | B.MENTION_EVERYONE;

const CATEGORY_KEYS = Object.freeze({
  GENERAL: "GENERAL",
  DEPARTMENTS: "DEPARTMENTS",
  BATCHES: "BATCHES",
  SECTIONS: "SECTIONS",
});

const DEFAULT_CATEGORIES = [
  { systemKey: CATEGORY_KEYS.GENERAL, name: "General", position: 0 },
  { systemKey: CATEGORY_KEYS.DEPARTMENTS, name: "Departments", position: 1 },
  { systemKey: CATEGORY_KEYS.BATCHES, name: "Batches", position: 2 },
  { systemKey: CATEGORY_KEYS.SECTIONS, name: "Sections", position: 3 },
];

function slugify(input, fallbackPrefix = "channel", suffix) {
  const base = String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9-_\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const safe = base || fallbackPrefix;
  return suffix ? `${safe}-${suffix}` : safe;
}

/**
 * Find the parent faculty id for a given academic scope (used to map
 * department/batch/section groups onto a faculty server).
 */
export async function resolveParentFacultyId(tx, scopeType, scopeId) {
  if (scopeType === DISCUSSION_SCOPE_TYPES.FACULTY) return scopeId;
  if (scopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
    const row = await tx.department.findUnique({
      where: { id: scopeId },
      select: { facultyId: true },
    });
    return row?.facultyId ?? null;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.BATCH) {
    const row = await tx.batch.findUnique({
      where: { id: scopeId },
      select: { program: { select: { department: { select: { facultyId: true } } } } },
    });
    return row?.program?.department?.facultyId ?? null;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.SECTION) {
    const row = await tx.batchSection.findUnique({
      where: { id: scopeId },
      select: {
        batch: {
          select: { program: { select: { department: { select: { facultyId: true } } } } },
        },
      },
    });
    return row?.batch?.program?.department?.facultyId ?? null;
  }
  return null;
}

function categoryKeyForScope(scopeType) {
  switch (scopeType) {
    case DISCUSSION_SCOPE_TYPES.DEPARTMENT:
      return CATEGORY_KEYS.DEPARTMENTS;
    case DISCUSSION_SCOPE_TYPES.BATCH:
      return CATEGORY_KEYS.BATCHES;
    case DISCUSSION_SCOPE_TYPES.SECTION:
      return CATEGORY_KEYS.SECTIONS;
    default:
      return null;
  }
}

function channelNameForScope(scopeType, scopeName, scopeId) {
  const safeName = String(scopeName || "").trim() || `${scopeType}-${scopeId}`;
  switch (scopeType) {
    case DISCUSSION_SCOPE_TYPES.DEPARTMENT:
      return `dept-${slugify(safeName, "dept")}`;
    case DISCUSSION_SCOPE_TYPES.BATCH:
      return `batch-${slugify(safeName, "batch")}`;
    case DISCUSSION_SCOPE_TYPES.SECTION:
      return `sec-${slugify(safeName, "sec")}`;
    default:
      return slugify(safeName, "channel");
  }
}

/**
 * Ensure all 4 default categories exist on a faculty server. Returns a map
 * { systemKey -> categoryRow }.
 */
export async function ensureDefaultCategories(tx, serverId) {
  const out = new Map();
  for (const cat of DEFAULT_CATEGORIES) {
    const row = await tx.discussionChannelCategory.upsert({
      where: { serverId_systemKey: { serverId, systemKey: cat.systemKey } },
      create: {
        serverId,
        systemKey: cat.systemKey,
        name: cat.name,
        position: cat.position,
        isSystem: true,
      },
      update: { name: cat.name, position: cat.position, isSystem: true },
    });
    out.set(cat.systemKey, row);
  }
  return out;
}

/**
 * Ensure pre-seeded system roles (EVERYONE, STUDENT, LECTURER, DEAN,
 * FACULTY_ADMIN) exist on the server with the default permission masks.
 */
export async function ensureSystemRoles(tx, serverId) {
  const order = [
    SYSTEM_ROLE_KEYS.EVERYONE,
    SYSTEM_ROLE_KEYS.STUDENT,
    SYSTEM_ROLE_KEYS.LECTURER,
    SYSTEM_ROLE_KEYS.DEAN,
    SYSTEM_ROLE_KEYS.FACULTY_ADMIN,
  ];
  const out = new Map();
  let position = 0;
  for (const key of order) {
    const perms = SYSTEM_ROLE_DEFAULTS[key];
    const row = await tx.discussionRole.upsert({
      where: { serverId_systemKey: { serverId, systemKey: key } },
      create: {
        serverId,
        systemKey: key,
        name: key,
        permissions: perms,
        position: position++,
        isSystem: true,
      },
      update: {
        name: key,
        permissions: perms,
        isSystem: true,
      },
    });
    out.set(key, row);
  }
  return out;
}

/**
 * Ensure the two default channels (#general, #announcements) exist in the
 * General category. Sets server.defaultChannelId to #general.
 */
export async function ensureDefaultChannels(tx, server, generalCategoryId) {
  const general = await tx.discussionChannel.upsert({
    where: { serverId_slug: { serverId: server.id, slug: "general" } },
    create: {
      serverId: server.id,
      categoryId: generalCategoryId,
      name: "general",
      slug: "general",
      kind: "TEXT",
      position: 0,
      isDefault: true,
    },
    update: {
      categoryId: generalCategoryId,
      name: "general",
      kind: "TEXT",
      isDefault: true,
    },
  });

  const announcements = await tx.discussionChannel.upsert({
    where: { serverId_slug: { serverId: server.id, slug: "announcements" } },
    create: {
      serverId: server.id,
      categoryId: generalCategoryId,
      name: "announcements",
      slug: "announcements",
      kind: "ANNOUNCEMENT",
      position: 1,
      isDefault: true,
    },
    update: {
      categoryId: generalCategoryId,
      name: "announcements",
      kind: "ANNOUNCEMENT",
    },
  });

  if (server.defaultChannelId !== general.id) {
    await tx.discussionGroup.update({
      where: { id: server.id },
      data: { defaultChannelId: general.id },
    });
  }

  const studentRole = await tx.discussionRole.findUnique({
    where: { serverId_systemKey: { serverId: server.id, systemKey: SYSTEM_ROLE_KEYS.STUDENT } },
    select: { id: true },
  });
  if (studentRole) {
    await tx.discussionPermissionOverwrite.upsert({
      where: {
        channelId_targetType_targetId: {
          channelId: announcements.id,
          targetType: "ROLE",
          targetId: studentRole.id,
        },
      },
      create: {
        channelId: announcements.id,
        targetType: "ROLE",
        targetId: studentRole.id,
        allow: 0n,
        deny: B.SEND_MESSAGES | B.SEND_MESSAGES_IN_THREADS | B.MENTION_EVERYONE,
      },
      update: {
        deny: B.SEND_MESSAGES | B.SEND_MESSAGES_IN_THREADS | B.MENTION_EVERYONE,
      },
    });
  }

  return { general, announcements };
}

/**
 * Ensure the kind/parentServer fields on a faculty group are set correctly
 * and seed its categories, default channels, and system roles.
 */
export async function ensureFacultyServerSkeleton(serverGroup, prismaClient = prisma) {
  const tx = prismaClient;
  const server = await tx.discussionGroup.update({
    where: { id: serverGroup.id },
    data: {
      kind: "FACULTY_SERVER",
      parentServerId: null,
    },
  });
  const categories = await ensureDefaultCategories(tx, server.id);
  const generalCategory = categories.get(CATEGORY_KEYS.GENERAL);
  await ensureSystemRoles(tx, server.id);
  await ensureDefaultChannels(tx, server, generalCategory.id);
  return { server, categories };
}

/**
 * Create / update the DiscussionChannel that shadows a legacy department/
 * batch/section DiscussionGroup. Idempotent.
 */
export async function ensureChannelForLegacyScopeGroup(legacyGroup, prismaClient = prisma) {
  const tx = prismaClient;
  const facultyId = await resolveParentFacultyId(tx, legacyGroup.scopeType, legacyGroup.scopeId);
  if (!facultyId) return null;

  const facultyServer = await tx.discussionGroup.findUnique({
    where: { scopeType_scopeId: { scopeType: "FACULTY", scopeId: facultyId } },
    select: { id: true, defaultChannelId: true, kind: true },
  });
  if (!facultyServer) return null;

  if (facultyServer.kind !== "FACULTY_SERVER") {
    await ensureFacultyServerSkeleton({ id: facultyServer.id }, tx);
  }

  const categoryKey = categoryKeyForScope(legacyGroup.scopeType);
  const category = categoryKey
    ? await tx.discussionChannelCategory.findUnique({
        where: { serverId_systemKey: { serverId: facultyServer.id, systemKey: categoryKey } },
        select: { id: true },
      })
    : null;

  const baseSlug = channelNameForScope(legacyGroup.scopeType, legacyGroup.name, legacyGroup.scopeId);
  let slug = baseSlug;

  const existingByLegacy = await tx.discussionChannel.findUnique({
    where: { legacyGroupId: legacyGroup.id },
    select: { id: true, slug: true },
  });

  if (!existingByLegacy) {
    let suffix = 0;
    while (true) {
      const collision = await tx.discussionChannel.findUnique({
        where: { serverId_slug: { serverId: facultyServer.id, slug } },
        select: { id: true },
      });
      if (!collision) break;
      suffix += 1;
      slug = `${baseSlug}-${legacyGroup.scopeId}${suffix > 1 ? `-${suffix}` : ""}`;
    }
  } else {
    slug = existingByLegacy.slug;
  }

  const isPrivate = legacyGroup.scopeType === DISCUSSION_SCOPE_TYPES.SECTION;

  const channel = await tx.discussionChannel.upsert({
    where: { legacyGroupId: legacyGroup.id },
    create: {
      serverId: facultyServer.id,
      categoryId: category?.id ?? null,
      name: slug,
      slug,
      kind: "TEXT",
      isPrivate,
      scopeType: legacyGroup.scopeType,
      scopeId: legacyGroup.scopeId,
      legacyGroupId: legacyGroup.id,
    },
    update: {
      categoryId: category?.id ?? null,
      isPrivate,
      scopeType: legacyGroup.scopeType,
      scopeId: legacyGroup.scopeId,
    },
  });

  await tx.discussionGroup.update({
    where: { id: legacyGroup.id },
    data: {
      kind:
        legacyGroup.scopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT
          ? "DEPARTMENT_LEGACY"
          : legacyGroup.scopeType === DISCUSSION_SCOPE_TYPES.BATCH
            ? "BATCH_LEGACY"
            : "SECTION_LEGACY",
      parentServerId: facultyServer.id,
    },
  });

  return channel;
}

function staffMemberRoles() {
  return new Set(["LECTURER", "DEAN", "HEAD", "ADVISOR", "ADMIN"]);
}

/**
 * Translate every DiscussionGroupMembership for a legacy scope group into
 * a member-level DiscussionPermissionOverwrite on the corresponding channel.
 * Idempotent.
 */
export async function translateMembershipsToOverwrites(
  legacyGroup,
  channelId,
  prismaClient = prisma,
) {
  const tx = prismaClient;
  const memberships = await tx.discussionGroupMembership.findMany({
    where: { groupId: legacyGroup.id, leftAt: null },
    select: { userId: true, role: true, isActive: true, canPost: true, canModerate: true },
  });
  const staff = staffMemberRoles();
  let count = 0;

  for (const m of memberships) {
    if (m.isActive === false) continue;
    let allow = MEMBER_ALLOW_MASK;
    if (staff.has(String(m.role).toUpperCase()) || m.canModerate) {
      allow |= STAFF_BONUS_MASK;
    }
    if (!m.canPost) {
      allow &= ~B.SEND_MESSAGES;
      allow &= ~B.SEND_MESSAGES_IN_THREADS;
    }
    await tx.discussionPermissionOverwrite.upsert({
      where: {
        channelId_targetType_targetId: {
          channelId,
          targetType: "MEMBER",
          targetId: m.userId,
        },
      },
      create: {
        channelId,
        targetType: "MEMBER",
        targetId: m.userId,
        allow,
        deny: 0n,
      },
      update: { allow, deny: 0n },
    });
    count += 1;
  }
  return count;
}

/**
 * Reparent every legacy DiscussionMessage that belongs to `legacyGroup` into
 * the matching `channelId`. Idempotent (skips messages already pointing at
 * this channel).
 */
export async function reparentLegacyMessages(legacyGroupId, channelId, prismaClient = prisma) {
  const channel = await prismaClient.discussionChannel.findUnique({
    where: { id: channelId },
    select: { serverId: true },
  });
  if (!channel) return 0;
  const result = await prismaClient.discussionMessage.updateMany({
    where: { groupId: legacyGroupId, channelId: null },
    data: { channelId, groupId: channel.serverId },
  });
  return result.count ?? 0;
}

/**
 * Reparent legacy faculty-scope messages into the faculty server's #general
 * channel. Idempotent.
 */
export async function reparentFacultyMessagesToGeneral(serverGroup, prismaClient = prisma) {
  const general = await prismaClient.discussionChannel.findUnique({
    where: { serverId_slug: { serverId: serverGroup.id, slug: "general" } },
    select: { id: true },
  });
  if (!general) return 0;
  const result = await prismaClient.discussionMessage.updateMany({
    where: { groupId: serverGroup.id, channelId: null },
    data: { channelId: general.id },
  });
  return result.count ?? 0;
}

/**
 * Run the full hybrid backfill. Returns a report of what changed.
 *
 * @param {{ prismaClient?: any, dryRun?: boolean }} [options]
 */
export async function runHybridBackfill({ prismaClient = prisma, dryRun = false } = {}) {
  const tx = prismaClient;
  const report = {
    facultiesProcessed: 0,
    legacyChannelsCreated: 0,
    legacyChannelsUpdated: 0,
    membershipOverwritesUpserted: 0,
    messagesReparented: 0,
    facultyMessagesReparented: 0,
    skipped: [],
  };

  if (dryRun) {
    const facultyCount = await tx.discussionGroup.count({
      where: { scopeType: "FACULTY" },
    });
    const legacyCount = await tx.discussionGroup.count({
      where: { scopeType: { in: ["DEPARTMENT", "BATCH", "SECTION"] } },
    });
    const membershipCount = await tx.discussionGroupMembership.count({
      where: { leftAt: null },
    });
    return { ...report, dryRun: true, facultyCount, legacyCount, membershipCount };
  }

  const facultyServers = await tx.discussionGroup.findMany({
    where: { scopeType: "FACULTY" },
    select: { id: true, scopeType: true, scopeId: true, name: true, defaultChannelId: true, kind: true },
  });

  for (const fac of facultyServers) {
    await ensureFacultyServerSkeleton(fac, tx);
    await reparentFacultyMessagesToGeneral(fac, tx).then((n) => {
      report.facultyMessagesReparented += n;
    });
    report.facultiesProcessed += 1;
  }

  const legacyGroups = await tx.discussionGroup.findMany({
    where: { scopeType: { in: ["DEPARTMENT", "BATCH", "SECTION"] } },
    select: { id: true, scopeType: true, scopeId: true, name: true },
  });

  for (const lg of legacyGroups) {
    const channel = await ensureChannelForLegacyScopeGroup(lg, tx);
    if (!channel) {
      report.skipped.push({ groupId: lg.id, scopeType: lg.scopeType, scopeId: lg.scopeId, reason: "no parent faculty" });
      continue;
    }
    if (channel.createdAt && Date.now() - new Date(channel.createdAt).getTime() < 5 * 60 * 1000) {
      report.legacyChannelsCreated += 1;
    } else {
      report.legacyChannelsUpdated += 1;
    }
    const owCount = await translateMembershipsToOverwrites(lg, channel.id, tx);
    report.membershipOverwritesUpserted += owCount;
    const rc = await reparentLegacyMessages(lg.id, channel.id, tx);
    report.messagesReparented += rc;
  }

  return report;
}

void PERMISSION_ADMINISTRATOR;
