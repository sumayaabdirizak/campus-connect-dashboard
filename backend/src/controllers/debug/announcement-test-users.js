import express from "express";
import { prisma } from "../../db/prisma.js";
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { canUserSeeAnnouncement } from "../../utils/announcement-visibility.js";
import { loadUserAnnouncementScope } from "../../utils/userAnnouncementScope.js";
import {
  runDiscussionMembershipNightlySync,
  syncDiscussionMembershipsForUser,
} from "../../features/discussions/membershipSync.service.js";

const router = express.Router();
const ALLOWED_TARGET_TYPES = new Set(["ALL", "FACULTY", "DEPARTMENT", "BATCH", "SECTION"]);

function normalizeTargetRoles(input) {
  const list = Array.isArray(input) ? input : input != null ? [input] : [];
  return Array.from(
    new Set(
      list
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function toNumberOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toHierarchyFromSection(section) {
  const batch = section?.batch ?? null;
  const program = batch?.program ?? null;
  const department = program?.department ?? null;
  const faculty = department?.faculty ?? null;
  return {
    faculty: faculty ? { id: faculty.id, name: faculty.name } : null,
    department: department ? { id: department.id, name: department.name } : null,
    batch: batch ? { id: batch.id, name: batch.name } : null,
    section: section ? { id: section.id, name: section.name } : null,
  };
}

function toUserDebugShape({ label, userId, role, facultyId = null, departmentId = null, batchId = null, sectionId = null, hierarchy = null }) {
  return {
    label,
    userId,
    role,
    facultyId,
    departmentId,
    batchId,
    sectionId,
    hierarchy,
  };
}

function logDebugUser(userData) {
  console.log(JSON.stringify(userData, null, 2));
}

function toVisibilityUserShape(scope) {
  return {
    id: scope.userId,
    role: scope.role,
    facultyIds: scope.facultyIds ?? [],
    departmentIds: scope.departmentIds ?? [],
    batchIds: scope.batchIds ?? [],
    sectionIds: scope.sectionIds ?? [],
  };
}

function summarizeScope(scope) {
  return {
    role: scope.role,
    facultyIds: scope.facultyIds ?? [],
    departmentIds: scope.departmentIds ?? [],
    batchIds: scope.batchIds ?? [],
    sectionIds: scope.sectionIds ?? [],
  };
}

router.get("/announcement-test-users", auth, requireRole("SUPER_ADMIN"), async (_req, res) => {
  try {
    const superAdmin = await prisma.user.findFirst({
      where: { role: { name: "SUPER_ADMIN" } },
      select: { id: true, role: { select: { name: true } } },
    });

    const dean = await prisma.user.findFirst({
      where: { role: { name: "DEAN" }, deanProfile: { isNot: null } },
      select: {
        id: true,
        role: { select: { name: true } },
        deanProfile: {
          select: {
            faculty: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const primaryStudent = await prisma.user.findFirst({
      where: {
        role: { name: "STUDENT" },
        studentRegistrations: { some: {} },
      },
      select: {
        id: true,
        role: { select: { name: true } },
        studentRegistrations: {
          orderBy: { id: "desc" },
          take: 1,
          select: {
            batchSection: {
              select: {
                id: true,
                name: true,
                batch: {
                  select: {
                    id: true,
                    name: true,
                    program: {
                      select: {
                        department: {
                          select: {
                            id: true,
                            name: true,
                            faculty: {
                              select: { id: true, name: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const primarySection = primaryStudent?.studentRegistrations?.[0]?.batchSection ?? null;
    const primaryHierarchy = toHierarchyFromSection(primarySection);
    const primaryDepartmentId = primaryHierarchy.department?.id ?? null;

    const secondStudent = await prisma.user.findFirst({
      where: {
        role: { name: "STUDENT" },
        ...(primaryStudent?.id ? { id: { not: primaryStudent.id } } : {}),
        studentRegistrations: {
          some: primaryDepartmentId
            ? {
                batchSection: {
                  batch: {
                    program: {
                      departmentId: { not: primaryDepartmentId },
                    },
                  },
                },
              }
            : {},
        },
      },
      select: {
        id: true,
        role: { select: { name: true } },
        studentRegistrations: {
          orderBy: { id: "desc" },
          take: 1,
          select: {
            batchSection: {
              select: {
                id: true,
                name: true,
                batch: {
                  select: {
                    id: true,
                    name: true,
                    program: {
                      select: {
                        department: {
                          select: {
                            id: true,
                            name: true,
                            faculty: {
                              select: { id: true, name: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const secondSection = secondStudent?.studentRegistrations?.[0]?.batchSection ?? null;
    const secondHierarchy = toHierarchyFromSection(secondSection);

    const teacher = await prisma.user.findFirst({
      where: {
        OR: [{ role: { name: "TEACHER" } }, { role: { name: "LECTURER" } }],
        lecturerProfile: { isNot: null },
      },
      select: {
        id: true,
        role: { select: { name: true } },
        lecturerProfile: {
          select: {
            department: {
              select: {
                id: true,
                name: true,
                faculty: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const payload = {
      superAdmin: superAdmin
        ? toUserDebugShape({
            label: "SUPER_ADMIN",
            userId: superAdmin.id,
            role: superAdmin.role.name,
          })
        : null,
      dean: dean
        ? toUserDebugShape({
            label: "DEAN",
            userId: dean.id,
            role: dean.role.name,
            facultyId: dean.deanProfile?.faculty?.id ?? null,
            hierarchy: {
              faculty: dean.deanProfile?.faculty
                ? { id: dean.deanProfile.faculty.id, name: dean.deanProfile.faculty.name }
                : null,
            },
          })
        : null,
      studentPrimary: primaryStudent
        ? toUserDebugShape({
            label: "STUDENT_PRIMARY",
            userId: primaryStudent.id,
            role: primaryStudent.role.name,
            facultyId: primaryHierarchy.faculty?.id ?? null,
            departmentId: primaryHierarchy.department?.id ?? null,
            batchId: primaryHierarchy.batch?.id ?? null,
            sectionId: primaryHierarchy.section?.id ?? null,
            hierarchy: primaryHierarchy,
          })
        : null,
      studentDifferentDepartment: secondStudent
        ? toUserDebugShape({
            label: "STUDENT_DIFFERENT_DEPARTMENT",
            userId: secondStudent.id,
            role: secondStudent.role.name,
            facultyId: secondHierarchy.faculty?.id ?? null,
            departmentId: secondHierarchy.department?.id ?? null,
            batchId: secondHierarchy.batch?.id ?? null,
            sectionId: secondHierarchy.section?.id ?? null,
            hierarchy: secondHierarchy,
          })
        : null,
      teacher: teacher
        ? toUserDebugShape({
            label: "TEACHER",
            userId: teacher.id,
            role: teacher.role.name,
            facultyId: teacher.lecturerProfile?.department?.faculty?.id ?? null,
            departmentId: teacher.lecturerProfile?.department?.id ?? null,
            hierarchy: {
              faculty: teacher.lecturerProfile?.department?.faculty
                ? {
                    id: teacher.lecturerProfile.department.faculty.id,
                    name: teacher.lecturerProfile.department.faculty.name,
                  }
                : null,
              department: teacher.lecturerProfile?.department
                ? {
                    id: teacher.lecturerProfile.department.id,
                    name: teacher.lecturerProfile.department.name,
                  }
                : null,
              batch: null,
              section: null,
            },
          })
        : null,
    };

    logDebugUser(payload.superAdmin);
    logDebugUser(payload.dean);
    logDebugUser(payload.studentPrimary);
    logDebugUser(payload.studentDifferentDepartment);
    logDebugUser(payload.teacher);

    return res.json(payload);
  } catch (error) {
    console.error("DEBUG announcement-test-users failed:", error);
    return res.status(500).json({ message: "Failed to fetch announcement test users" });
  }
});

/**
 * Verify target scope and who can see an announcement without creating/updating anything.
 * GET  /api/debug/announcement-scope-check/:id   -> checks a saved announcement
 * POST /api/debug/announcement-scope-check       -> checks an ad-hoc target payload
 */
router.get("/announcement-scope-check/:id", auth, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        targetType: true,
        targetRoles: true,
        facultyId: true,
        departmentId: true,
        batchId: true,
        sectionId: true,
        isActive: true,
        publishedAt: true,
      },
    });
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    return evaluateTargetAgainstUsers(announcement, res);
  } catch (error) {
    console.error("DEBUG announcement-scope-check/:id failed:", error);
    return res.status(500).json({ message: "Failed to check announcement scope" });
  }
});

router.post("/announcement-scope-check", auth, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const targetType = String(req.body?.targetType ?? "").toUpperCase();
    if (!ALLOWED_TARGET_TYPES.has(targetType)) {
      return res.status(400).json({ message: "Invalid targetType" });
    }

    const targetRoles = normalizeTargetRoles(req.body?.targetRoles);
    if (targetRoles.length === 0) {
      return res.status(400).json({ message: "targetRoles is required" });
    }

    const target = {
      id: null,
      title: req.body?.title ?? "debug-target",
      targetType,
      targetRoles,
      facultyId: toNumberOrNull(req.body?.facultyId),
      departmentId: toNumberOrNull(req.body?.departmentId),
      batchId: toNumberOrNull(req.body?.batchId),
      sectionId: toNumberOrNull(req.body?.sectionId),
      isActive: true,
      publishedAt: null,
    };

    return evaluateTargetAgainstUsers(target, res);
  } catch (error) {
    console.error("DEBUG announcement-scope-check failed:", error);
    return res.status(500).json({ message: "Failed to check target scope" });
  }
});

router.post("/discussion-memberships/sync", auth, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const userId = req.body?.userId ? Number(req.body.userId) : null;
    if (userId) {
      const result = await syncDiscussionMembershipsForUser(userId);
      return res.json({ mode: "single", result });
    }

    const results = await runDiscussionMembershipNightlySync();
    return res.json({
      mode: "nightly",
      syncedUsers: results.length,
    });
  } catch (error) {
    console.error("DEBUG discussion-memberships/sync failed:", error);
    return res.status(500).json({ message: "Failed to sync discussion memberships" });
  }
});

async function evaluateTargetAgainstUsers(target, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      role: { select: { name: true } },
    },
    orderBy: { id: "asc" },
  });

  /** @type {Array<{userId:number,email:string,full_name:string,role:string,visible:boolean,scope:object}>} */
  const evaluated = [];
  for (const user of users) {
    const scope = await loadUserAnnouncementScope(prisma, user.id);
    if (!scope) continue;
    const visibilityUser = toVisibilityUserShape(scope);
    const visible = canUserSeeAnnouncement(visibilityUser, target);
    evaluated.push({
      userId: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role.name,
      visible,
      scope: summarizeScope(scope),
    });
  }

  const visibleUsers = evaluated.filter((u) => u.visible);
  const visibleByRole = visibleUsers.reduce((acc, item) => {
    acc[item.role] = (acc[item.role] ?? 0) + 1;
    return acc;
  }, {});

  return res.json({
    target,
    summary: {
      totalUsersChecked: evaluated.length,
      visibleUsers: visibleUsers.length,
      visibleByRole,
    },
    visibleUsers,
  });
}

export default router;
