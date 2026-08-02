import { PERMISSION_BITS, SYSTEM_ROLE_DEFAULTS, SYSTEM_ROLE_KEYS } from "../permissions/constants.js";
import { CATEGORY_KEYS, DEFAULT_CATEGORIES } from "./constants.js";

const B = PERMISSION_BITS;

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

export async function ensureFacultyServerSkeleton(serverGroup, prismaClient) {
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
