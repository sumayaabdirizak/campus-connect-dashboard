import { prisma } from "../../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES } from "../policy.js";
import { ensureFacultyServerSkeleton } from "./facultySkeleton.js";
import { resolveParentFacultyId } from "./parentFaculty.js";
import { categoryKeyForScope, channelNameForScope } from "./slugHelpers.js";

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
      // Inbox / Messages open this channel (lives on the parent faculty server).
      defaultChannelId: channel.id,
    },
  });

  return channel;
}
