import { prisma } from "../../db/prisma.js";
import {
  DISCUSSION_CONTEXT_ROLES,
  DISCUSSION_SCOPE_TYPES,
  getDefaultDiscussionPermissions,
} from "./policy.js";
import {
  ensureDiscussionGroupForScope,
  gatherUserIdsForDiscussionScopeRefresh,
} from "./groupProvisioning.service.js";
import { translateMembershipsToOverwrites } from "./serverHierarchy.service.js";

/** True for a real academic FK (schema sometimes uses 0 as unset). */
function validAcademicId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0;
}

const ROLE_PRIORITY = {
  [DISCUSSION_CONTEXT_ROLES.DEAN]: 60,
  [DISCUSSION_CONTEXT_ROLES.HEAD]: 50,
  [DISCUSSION_CONTEXT_ROLES.ADMIN]: 45,
  [DISCUSSION_CONTEXT_ROLES.ADVISOR]: 40,
  [DISCUSSION_CONTEXT_ROLES.LECTURER]: 30,
  [DISCUSSION_CONTEXT_ROLES.STUDENT]: 10,
};

function withHigherRole(currentRole, candidateRole) {
  if (!currentRole) return candidateRole;
  const currentWeight = ROLE_PRIORITY[currentRole] ?? 0;
  const candidateWeight = ROLE_PRIORITY[candidateRole] ?? 0;
  return candidateWeight > currentWeight ? candidateRole : currentRole;
}

function scopeKey(scopeType, scopeId) {
  return `${scopeType}:${scopeId}`;
}

function toScopeTuple(scopeKeyValue) {
  const [scopeType, id] = scopeKeyValue.split(":");
  return { scopeType, scopeId: Number(id) };
}

async function resolveScopeDisplayName(tx, scopeType, scopeId) {
  if (scopeType === DISCUSSION_SCOPE_TYPES.FACULTY) {
    const row = await tx.faculty.findUnique({ where: { id: scopeId }, select: { name: true } });
    return row?.name ?? `Faculty ${scopeId}`;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
    const row = await tx.department.findUnique({ where: { id: scopeId }, select: { name: true } });
    return row?.name ?? `Department ${scopeId}`;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.BATCH) {
    const row = await tx.batch.findUnique({ where: { id: scopeId }, select: { name: true } });
    return row?.name ?? `Batch ${scopeId}`;
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.SECTION) {
    const row = await tx.batchSection.findUnique({ where: { id: scopeId }, select: { name: true } });
    return row?.name ?? `Section ${scopeId}`;
  }
  return `Group ${scopeType} ${scopeId}`;
}

function addDesiredRole(desiredByScope, scopeType, scopeId, role) {
  const key = scopeKey(scopeType, scopeId);
  const existingRole = desiredByScope.get(key);
  desiredByScope.set(key, withHigherRole(existingRole, role));
}

/**
 * @param {number} userId
 * @param {import("@prisma/client").PrismaClient} [prismaClient]
 * @param {{ skipGroupProvisioning?: boolean }} [options]
 * When skipGroupProvisioning is true, groups must already exist (e.g. after backfill). Avoids nested writes and reduces deadlocks during bulk sync.
 */
export async function syncDiscussionMembershipsForUser(userId, prismaClient = prisma, options = {}) {
  const { skipGroupProvisioning = false } = options;
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error(`Invalid userId: ${userId}`);
  }

  return prismaClient.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: numericUserId },
      select: {
        id: true,
        status: true,
        role: { select: { name: true } },
        deanProfile: { select: { facultyId: true } },
        facultiesAsDean: { select: { id: true } },
        facultyAdminProfile: { select: { faculty_id: true } },
        lecturerProfile: {
          select: {
            departmentId: true,
            faculties: { select: { facultyId: true } },
          },
        },
        studentProfile: {
          select: {
            facultyId: true,
            departmentId: true,
          },
        },
        studentRegistrations: {
          select: {
            batchSectionId: true,
            batchSection: {
              select: {
                batchId: true,
                batch: {
                  select: {
                    id: true,
                    program: {
                      select: {
                        departmentId: true,
                        department: { select: { id: true, facultyId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        teacherAssignings: {
          select: {
            course: {
              select: {
                offerings: {
                  select: { sectionId: true, section: { select: { batchId: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return { userId: numericUserId, syncedGroups: 0, disabledOnly: true };

    const desiredByScope = new Map();

    if (user.deanProfile?.facultyId && validAcademicId(user.deanProfile.facultyId)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.FACULTY,
        user.deanProfile.facultyId,
        DISCUSSION_CONTEXT_ROLES.DEAN
      );
    }
    for (const faculty of user.facultiesAsDean ?? []) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.FACULTY,
        faculty.id,
        DISCUSSION_CONTEXT_ROLES.DEAN
      );
    }

    const deanFacultyIds = new Set();
    if (user.deanProfile?.facultyId && validAcademicId(user.deanProfile.facultyId)) {
      deanFacultyIds.add(user.deanProfile.facultyId);
    }
    for (const faculty of user.facultiesAsDean ?? []) {
      deanFacultyIds.add(faculty.id);
    }
    for (const fid of deanFacultyIds) {
      const departmentsInFaculty = await tx.department.findMany({
        where: { facultyId: fid },
        select: { id: true },
      });
      for (const d of departmentsInFaculty) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.DEPARTMENT,
          d.id,
          DISCUSSION_CONTEXT_ROLES.DEAN
        );
      }
      const batchesInFaculty = await tx.batch.findMany({
        where: { program: { department: { facultyId: fid } } },
        select: { id: true },
      });
      for (const b of batchesInFaculty) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.BATCH,
          b.id,
          DISCUSSION_CONTEXT_ROLES.DEAN
        );
      }
    }

    if (user.facultyAdminProfile?.faculty_id && validAcademicId(user.facultyAdminProfile.faculty_id)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.FACULTY,
        user.facultyAdminProfile.faculty_id,
        DISCUSSION_CONTEXT_ROLES.ADMIN
      );
    }

    if (user.lecturerProfile?.departmentId && validAcademicId(user.lecturerProfile.departmentId)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.DEPARTMENT,
        user.lecturerProfile.departmentId,
        DISCUSSION_CONTEXT_ROLES.LECTURER
      );
    }

    if (user.studentProfile?.departmentId && validAcademicId(user.studentProfile.departmentId)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.DEPARTMENT,
        user.studentProfile.departmentId,
        DISCUSSION_CONTEXT_ROLES.STUDENT
      );
    }

    for (const registration of user.studentRegistrations ?? []) {
      const prog = registration.batchSection?.batch?.program;
      const deptIdFromReg = prog?.departmentId;
      const facIdFromReg = prog?.department?.facultyId;
      if (validAcademicId(facIdFromReg)) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.FACULTY,
          facIdFromReg,
          DISCUSSION_CONTEXT_ROLES.STUDENT
        );
      }
      if (validAcademicId(deptIdFromReg)) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.DEPARTMENT,
          deptIdFromReg,
          DISCUSSION_CONTEXT_ROLES.STUDENT
        );
      }
      const batchId = registration.batchSection?.batchId;
      if (validAcademicId(batchId)) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.BATCH,
          batchId,
          DISCUSSION_CONTEXT_ROLES.STUDENT
        );
      }
      if (validAcademicId(registration.batchSectionId)) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.SECTION,
          registration.batchSectionId,
          DISCUSSION_CONTEXT_ROLES.STUDENT
        );
      }
    }

    for (const assignment of user.teacherAssignings ?? []) {
      for (const offering of assignment.course?.offerings ?? []) {
        if (offering.section?.batchId && validAcademicId(offering.section.batchId)) {
          addDesiredRole(
            desiredByScope,
            DISCUSSION_SCOPE_TYPES.BATCH,
            offering.section.batchId,
            DISCUSSION_CONTEXT_ROLES.LECTURER
          );
        }
        if (offering.sectionId && validAcademicId(offering.sectionId)) {
          addDesiredRole(
            desiredByScope,
            DISCUSSION_SCOPE_TYPES.SECTION,
            offering.sectionId,
            DISCUSSION_CONTEXT_ROLES.LECTURER
          );
        }
      }
    }

    if (user.studentProfile?.facultyId && validAcademicId(user.studentProfile.facultyId)) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.FACULTY,
        user.studentProfile.facultyId,
        DISCUSSION_CONTEXT_ROLES.STUDENT
      );
    }

    if (user.lecturerProfile?.departmentId) {
      const deptRow = await tx.department.findUnique({
        where: { id: user.lecturerProfile.departmentId },
        select: { facultyId: true },
      });
      if (deptRow?.facultyId && validAcademicId(deptRow.facultyId)) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.FACULTY,
          deptRow.facultyId,
          DISCUSSION_CONTEXT_ROLES.LECTURER
        );
      }
    }
    for (const lf of user.lecturerProfile?.faculties ?? []) {
      if (lf.facultyId && validAcademicId(lf.facultyId)) {
        addDesiredRole(
          desiredByScope,
          DISCUSSION_SCOPE_TYPES.FACULTY,
          lf.facultyId,
          DISCUSSION_CONTEXT_ROLES.LECTURER
        );
      }
    }

    const departmentsAsHead = await tx.department.findMany({
      where: { headUserId: numericUserId },
      select: { id: true },
    });
    for (const d of departmentsAsHead) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.DEPARTMENT,
        d.id,
        DISCUSSION_CONTEXT_ROLES.HEAD
      );
    }

    const batchesAsAdvisor = await tx.batch.findMany({
      where: { advisorUserId: numericUserId },
      select: { id: true },
    });
    for (const b of batchesAsAdvisor) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.BATCH,
        b.id,
        DISCUSSION_CONTEXT_ROLES.HEAD
      );
    }

    const sectionsAsModerator = await tx.batchSection.findMany({
      where: { moderatorUserId: numericUserId },
      select: { id: true },
    });
    for (const s of sectionsAsModerator) {
      addDesiredRole(
        desiredByScope,
        DISCUSSION_SCOPE_TYPES.SECTION,
        s.id,
        DISCUSSION_CONTEXT_ROLES.HEAD
      );
    }

    const desiredGroupIds = new Set();
    const membershipsToUpsert = [];
    for (const [k, role] of desiredByScope.entries()) {
      const { scopeType, scopeId } = toScopeTuple(k);
      let group;
      if (skipGroupProvisioning) {
        group = await tx.discussionGroup.findUnique({
          where: { scopeType_scopeId: { scopeType, scopeId } },
          select: { id: true, scopeType: true },
        });
        if (!group) {
          throw new Error(
            `Missing DiscussionGroup for ${scopeType} ${scopeId}. Run group backfill (ensureDiscussionGroupForScope) first.`
          );
        }
      } else {
        const name = await resolveScopeDisplayName(tx, scopeType, scopeId);
        group = await ensureDiscussionGroupForScope({
          scopeType,
          scopeId,
          name,
          prismaClient: tx,
        });
      }
      desiredGroupIds.add(group.id);
      membershipsToUpsert.push({ groupId: group.id, role, scopeType: group.scopeType });
    }

    const isUserActive = String(user.status || "").toUpperCase() === "ACTIVE";

    for (const item of membershipsToUpsert) {
      const perms = getDefaultDiscussionPermissions({
        scopeType: item.scopeType,
        role: item.role,
      });
      await tx.discussionGroupMembership.upsert({
        where: { groupId_userId: { groupId: item.groupId, userId: numericUserId } },
        create: {
          groupId: item.groupId,
          userId: numericUserId,
          role: item.role,
          canPost: perms.canPost,
          canModerate: perms.canModerate,
          isActive: isUserActive,
          leftAt: isUserActive ? null : new Date(),
        },
        update: {
          role: item.role,
          canPost: perms.canPost,
          canModerate: perms.canModerate,
          isActive: isUserActive,
          leftAt: isUserActive ? null : new Date(),
        },
      });
    }

    const legacyScopeTypes = new Set([
      DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      DISCUSSION_SCOPE_TYPES.BATCH,
      DISCUSSION_SCOPE_TYPES.SECTION,
    ]);
    const refreshedLegacyGroupIds = new Set();
    for (const item of membershipsToUpsert) {
      if (!legacyScopeTypes.has(String(item.scopeType || "").toUpperCase())) continue;
      if (refreshedLegacyGroupIds.has(item.groupId)) continue;
      const lg = await tx.discussionGroup.findUnique({ where: { id: item.groupId } });
      const ch = await tx.discussionChannel.findFirst({
        where: { legacyGroupId: item.groupId },
        select: { id: true },
      });
      if (lg && ch?.id) {
        await translateMembershipsToOverwrites(lg, ch.id, tx);
        refreshedLegacyGroupIds.add(item.groupId);
      }
    }

    const existingMemberships = await tx.discussionGroupMembership.findMany({
      where: { userId: numericUserId, leftAt: null },
      select: { groupId: true },
    });

    for (const membership of existingMemberships) {
      if (!desiredGroupIds.has(membership.groupId)) {
        await tx.discussionGroupMembership.update({
          where: {
            groupId_userId: {
              groupId: membership.groupId,
              userId: numericUserId,
            },
          },
          data: {
            leftAt: new Date(),
            isActive: false,
          },
        });
        await tx.discussionGroup.update({
          where: { id: membership.groupId },
          data: { e2eeRotationRequired: true },
        });
      }
    }

    return {
      userId: numericUserId,
      syncedGroups: desiredGroupIds.size,
      userStatus: user.status,
    };
  });
}

export async function syncDiscussionMembershipsForUsers(userIds, prismaClient = prisma, options = {}) {
  const uniqueIds = Array.from(new Set((userIds || []).map((id) => Number(id)).filter(Boolean)));
  const results = [];
  for (const id of uniqueIds) {
    results.push(await syncDiscussionMembershipsForUser(id, prismaClient, options));
  }
  return results;
}

/**
 * Re-run group skeleton + membership reconciliation for one academic scope after create/update.
 * Ensures dean/head/advisor/moderator assignments and hybrid channel overwrites stay aligned.
 */
export async function refreshDiscussionMembershipsForScope(
  { scopeType, scopeId },
  prismaClient = prisma
) {
  const st = String(scopeType || "").toUpperCase();
  const sid = Number(scopeId);
  const name = await resolveScopeDisplayName(prismaClient, st, sid);
  await ensureDiscussionGroupForScope({
    scopeType: st,
    scopeId: sid,
    name,
    prismaClient,
  });
  const userIds = await gatherUserIdsForDiscussionScopeRefresh(prismaClient, st, sid);
  await syncDiscussionMembershipsForUsers(userIds, prismaClient);
}

export async function deactivateDiscussionMembershipsForUser(userId, prismaClient = prisma) {
  const numericUserId = Number(userId);
  const groups = await prismaClient.discussionGroupMembership.findMany({
    where: { userId: numericUserId, leftAt: null },
    select: { groupId: true },
  });
  await prismaClient.discussionGroupMembership.updateMany({
    where: { userId: numericUserId, leftAt: null },
    data: {
      isActive: false,
      leftAt: new Date(),
    },
  });
  if (groups.length > 0) {
    await prismaClient.discussionGroup.updateMany({
      where: { id: { in: groups.map((g) => g.groupId) } },
      data: { e2eeRotationRequired: true },
    });
  }
}

export async function runDiscussionMembershipNightlySync(prismaClient = prisma) {
  const users = await prismaClient.user.findMany({
    select: { id: true },
    where: {
      OR: [
        { studentProfile: { isNot: null } },
        { lecturerProfile: { isNot: null } },
        { deanProfile: { isNot: null } },
        { facultyAdminProfile: { isNot: null } },
      ],
    },
  });
  return syncDiscussionMembershipsForUsers(users.map((u) => u.id), prismaClient);
}
