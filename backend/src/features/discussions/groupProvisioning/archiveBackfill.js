import { prisma } from "../../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES } from "../policy.js";
import { ensureDiscussionGroupForScope } from "./ensureGroup.js";

export async function archiveDiscussionGroupForScope({
  scopeType,
  scopeId,
  prismaClient = prisma,
}) {
  const normalizedScopeType = String(scopeType || "").toUpperCase();
  const numericScopeId = Number(scopeId);
  try {
    return await prismaClient.discussionGroup.update({
      where: { scopeType_scopeId: { scopeType: normalizedScopeType, scopeId: numericScopeId } },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    });
  } catch (error) {
    if (error?.code === "P2025") return null;
    throw error;
  }
}

export async function backfillMissingDiscussionGroups(prismaClient = prisma) {
  const [faculties, departments, batches, sections] = await Promise.all([
    prismaClient.faculty.findMany({ select: { id: true, name: true } }),
    prismaClient.department.findMany({ select: { id: true, name: true } }),
    prismaClient.batch.findMany({ select: { id: true, name: true } }),
    prismaClient.batchSection.findMany({ select: { id: true, name: true } }),
  ]);

  for (const faculty of faculties) {
    await ensureDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.FACULTY,
      scopeId: faculty.id,
      name: faculty.name,
      prismaClient,
    });
  }
  for (const department of departments) {
    await ensureDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      scopeId: department.id,
      name: department.name,
      prismaClient,
    });
  }
  for (const batch of batches) {
    await ensureDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
      scopeId: batch.id,
      name: batch.name,
      prismaClient,
    });
  }
  for (const section of sections) {
    await ensureDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
      scopeId: section.id,
      name: section.name,
      prismaClient,
    });
  }
}
