import { prisma } from "../../db/prisma.js";
import {
  DISCUSSION_CONTEXT_ROLES,
  DISCUSSION_SCOPE_TYPES,
  getDefaultDiscussionPermissions,
  toDiscussionGroupKey,
} from "./policy.js";
import {
  ensureChannelForLegacyScopeGroup,
  ensureFacultyServerSkeleton,
} from "./serverHierarchy.service.js";

function mapGlobalRoleToDiscussionRole(globalRoleName) {
  switch (String(globalRoleName || "").toUpperCase()) {
    case "DEAN":
      return DISCUSSION_CONTEXT_ROLES.DEAN;
    case "TEACHER":
      return DISCUSSION_CONTEXT_ROLES.LECTURER;
    case "FACULTY_ADMIN":
    case "SUPER_ADMIN":
      return DISCUSSION_CONTEXT_ROLES.ADMIN;
    case "STUDENT":
      return DISCUSSION_CONTEXT_ROLES.STUDENT;
    default:
      return null;
  }
}

/** When one user appears with multiple roles, keep the stronger discussion role. */
const MEMBER_ROLE_PRIORITY = {
  [DISCUSSION_CONTEXT_ROLES.DEAN]: 60,
  [DISCUSSION_CONTEXT_ROLES.HEAD]: 50,
  [DISCUSSION_CONTEXT_ROLES.ADMIN]: 45,
  [DISCUSSION_CONTEXT_ROLES.ADVISOR]: 40,
  [DISCUSSION_CONTEXT_ROLES.LECTURER]: 30,
  [DISCUSSION_CONTEXT_ROLES.STUDENT]: 10,
};

function mergeMembersByHighestRole(members) {
  const map = new Map();
  for (const member of members) {
    const key = String(member.userId);
    const prev = map.get(key);
    const nextWeight = MEMBER_ROLE_PRIORITY[member.role] ?? 0;
    const prevWeight = prev ? MEMBER_ROLE_PRIORITY[prev.role] ?? 0 : -1;
    if (!prev || nextWeight > prevWeight) {
      map.set(key, member);
    }
  }
  return [...map.values()];
}

async function upsertMembership(tx, { groupId, userId, role, scopeType }) {
  const perms = getDefaultDiscussionPermissions({ scopeType, role });
  return tx.discussionGroupMembership.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: {
      groupId,
      userId,
      role,
      canPost: perms.canPost,
      canModerate: perms.canModerate,
      leftAt: null,
    },
    update: {
      role,
      canPost: perms.canPost,
      canModerate: perms.canModerate,
      leftAt: null,
    },
  });
}

async function getDefaultMembersForScope(tx, { scopeType, scopeId }) {
  const members = [];

  if (scopeType === DISCUSSION_SCOPE_TYPES.FACULTY) {
    const [deanProfile, facultyAdmins, lecturerAffiliates, deptLecturers] = await Promise.all([
      tx.deanProfile.findFirst({
        where: { facultyId: scopeId },
        select: { userId: true },
      }),
      tx.facultyAdminProfile.findMany({
        where: { faculty_id: scopeId },
        select: { user_id: true },
      }),
      tx.lecturerFaculty.findMany({
        where: { facultyId: scopeId },
        select: { lecturerProfile: { select: { userId: true } } },
      }),
      tx.lecturerProfile.findMany({
        where: { department: { facultyId: scopeId } },
        select: { userId: true },
      }),
    ]);

    if (deanProfile?.userId) {
      members.push({ userId: deanProfile.userId, role: DISCUSSION_CONTEXT_ROLES.DEAN });
    }
    for (const admin of facultyAdmins) {
      members.push({ userId: admin.user_id, role: DISCUSSION_CONTEXT_ROLES.ADMIN });
    }
    for (const row of lecturerAffiliates) {
      if (row.lecturerProfile?.userId) {
        members.push({
          userId: row.lecturerProfile.userId,
          role: DISCUSSION_CONTEXT_ROLES.LECTURER,
        });
      }
    }
    for (const lec of deptLecturers) {
      members.push({ userId: lec.userId, role: DISCUSSION_CONTEXT_ROLES.LECTURER });
    }
    return members;
  }

  if (scopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
    const department = await tx.department.findUnique({
      where: { id: scopeId },
      select: {
        headUserId: true,
        faculty: { select: { deanProfile: { select: { userId: true } } } },
      },
    });
    const lecturers = await tx.lecturerProfile.findMany({
      where: { departmentId: scopeId },
      select: { userId: true },
    });

    if (department?.faculty?.deanProfile?.userId) {
      members.push({
        userId: department.faculty.deanProfile.userId,
        role: DISCUSSION_CONTEXT_ROLES.DEAN,
      });
    }
    if (department?.headUserId) {
      members.push({
        userId: department.headUserId,
        role: DISCUSSION_CONTEXT_ROLES.HEAD,
      });
    }
    for (const lecturer of lecturers) {
      members.push({
        userId: lecturer.userId,
        role: DISCUSSION_CONTEXT_ROLES.LECTURER,
      });
    }
    return members;
  }

  if (scopeType === DISCUSSION_SCOPE_TYPES.BATCH) {
    const batch = await tx.batch.findUnique({
      where: { id: scopeId },
      select: {
        advisorUserId: true,
        program: {
          select: {
            department: {
              select: {
                faculty: { select: { deanProfile: { select: { userId: true } } } },
              },
            },
          },
        },
      },
    });

    if (batch?.program?.department?.faculty?.deanProfile?.userId) {
      members.push({
        userId: batch.program.department.faculty.deanProfile.userId,
        role: DISCUSSION_CONTEXT_ROLES.DEAN,
      });
    }
    if (batch?.advisorUserId) {
      members.push({
        userId: batch.advisorUserId,
        role: DISCUSSION_CONTEXT_ROLES.HEAD,
      });
    }

    const [studentRows, offeringTeachers] = await Promise.all([
      tx.studentRegistration.findMany({
        where: { batchSection: { batchId: scopeId } },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
      tx.courseOffering.findMany({
        where: {
          section: { batchId: scopeId },
          teacherId: { not: null },
        },
        select: { teacherId: true },
        distinct: ["teacherId"],
      }),
    ]);

    for (const row of studentRows) {
      members.push({ userId: row.studentId, role: DISCUSSION_CONTEXT_ROLES.STUDENT });
    }
    for (const row of offeringTeachers) {
      if (row.teacherId) {
        members.push({
          userId: row.teacherId,
          role: DISCUSSION_CONTEXT_ROLES.LECTURER,
        });
      }
    }
    return members;
  }

  if (scopeType === DISCUSSION_SCOPE_TYPES.SECTION) {
    const section = await tx.batchSection.findUnique({
      where: { id: scopeId },
      select: { moderatorUserId: true },
    });

    const [studentRows, offerings] = await Promise.all([
      tx.studentRegistration.findMany({
        where: { batchSectionId: scopeId },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
      tx.courseOffering.findMany({
        where: { sectionId: scopeId, teacherId: { not: null } },
        select: { id: true, teacherId: true },
        orderBy: { id: "asc" },
      }),
    ]);

    for (const row of studentRows) {
      members.push({ userId: row.studentId, role: DISCUSSION_CONTEXT_ROLES.STUDENT });
    }

    const teacherIds = [];
    const seen = new Set();
    for (const off of offerings) {
      if (off.teacherId && !seen.has(off.teacherId)) {
        seen.add(off.teacherId);
        teacherIds.push(off.teacherId);
      }
    }

    let moderatorId = section?.moderatorUserId ?? null;
    if (!moderatorId && teacherIds.length > 0) {
      moderatorId = teacherIds[0];
    }

    if (moderatorId) {
      members.push({ userId: moderatorId, role: DISCUSSION_CONTEXT_ROLES.HEAD });
    }
    for (const tid of teacherIds) {
      if (tid !== moderatorId) {
        members.push({ userId: tid, role: DISCUSSION_CONTEXT_ROLES.LECTURER });
      }
    }
    return members;
  }

  return members;
}

/**
 * User ids that should be reconciled when a scope row changes (stakeholders + existing members).
 */
export async function gatherUserIdsForDiscussionScopeRefresh(prismaClient, scopeType, scopeId) {
  const normalizedScopeType = String(scopeType || "").toUpperCase();
  const numericScopeId = Number(scopeId);
  const members = await getDefaultMembersForScope(prismaClient, {
    scopeType: normalizedScopeType,
    scopeId: numericScopeId,
  });
  const ids = new Set(members.map((m) => m.userId));
  const group = await prismaClient.discussionGroup.findUnique({
    where: {
      scopeType_scopeId: { scopeType: normalizedScopeType, scopeId: numericScopeId },
    },
    select: { id: true },
  });
  if (group) {
    const existing = await prismaClient.discussionGroupMembership.findMany({
      where: { groupId: group.id, leftAt: null },
      select: { userId: true },
    });
    for (const row of existing) {
      ids.add(row.userId);
    }
  }
  return [...ids];
}

export async function ensureDiscussionGroupForScope({
  scopeType,
  scopeId,
  name,
  prismaClient = prisma,
}) {
  const normalizedScopeType = String(scopeType || "").toUpperCase();
  const numericScopeId = Number(scopeId);
  const groupKey = toDiscussionGroupKey(normalizedScopeType, numericScopeId);
  const client = prismaClient;
  const group = await client.discussionGroup.upsert({
    where: { scopeType_scopeId: { scopeType: normalizedScopeType, scopeId: numericScopeId } },
    create: {
      scopeType: normalizedScopeType,
      scopeId: numericScopeId,
      groupKey,
      name,
    },
    update: {
      // Keep latest display name if entity was renamed.
      name,
      groupKey,
    },
  });

  const defaultMembers = mergeMembersByHighestRole(
    await getDefaultMembersForScope(client, {
      scopeType: normalizedScopeType,
      scopeId: numericScopeId,
    })
  );

  for (const member of defaultMembers) {
    await upsertMembership(client, {
      groupId: group.id,
      userId: member.userId,
      role: member.role,
      scopeType: normalizedScopeType,
    });
  }

  if (normalizedScopeType === DISCUSSION_SCOPE_TYPES.FACULTY) {
    await ensureFacultyServerSkeleton(group, client);
  } else if (
    normalizedScopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT ||
    normalizedScopeType === DISCUSSION_SCOPE_TYPES.BATCH ||
    normalizedScopeType === DISCUSSION_SCOPE_TYPES.SECTION
  ) {
    await ensureChannelForLegacyScopeGroup(group, client);
  }

  return group;
}

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
    // P2025 = record not found; silently ignore.
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

export { mapGlobalRoleToDiscussionRole };
