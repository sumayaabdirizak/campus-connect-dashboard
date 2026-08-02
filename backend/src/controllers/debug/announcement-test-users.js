import express from 'express';
import { prisma } from '../../db/prisma.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  runDiscussionMembershipNightlySync,
  syncDiscussionMembershipsForUser,
} from '../../services/discussions/membershipSync.service.js';
import {
  ALLOWED_TARGET_TYPES,
  normalizeTargetRoles,
  toNumberOrNull,
  toHierarchyFromSection,
  toUserDebugShape,
  logDebugUser,
  evaluateTargetAgainstUsers,
} from './announcement-debug.helpers.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /announcement-test-users — fetch representative users for each role
// ---------------------------------------------------------------------------
router.get('/announcement-test-users', requireRole('SUPER_ADMIN'), async (_req, res) => {
  try {
    const superAdmin = await prisma.user.findFirst({
      where: { role: { name: 'SUPER_ADMIN' } },
      select: { id: true, role: { select: { name: true } } },
    });

    const dean = await prisma.user.findFirst({
      where: { role: { name: 'DEAN' }, deanProfile: { isNot: null } },
      select: {
        id: true,
        role: { select: { name: true } },
        deanProfile: { select: { faculty: { select: { id: true, name: true } } } },
      },
    });

    const studentSelect = {
      id: true,
      role: { select: { name: true } },
      studentRegistrations: {
        orderBy: { id: 'desc' },
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
                          faculty: { select: { id: true, name: true } },
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
    };

    const primaryStudent = await prisma.user.findFirst({
      where: { role: { name: 'STUDENT' }, studentRegistrations: { some: {} } },
      select: studentSelect,
    });

    const primarySection = primaryStudent?.studentRegistrations?.[0]?.batchSection ?? null;
    const primaryHierarchy = toHierarchyFromSection(primarySection);
    const primaryDepartmentId = primaryHierarchy.department?.id ?? null;

    const secondStudent = await prisma.user.findFirst({
      where: {
        role: { name: 'STUDENT' },
        ...(primaryStudent?.id ? { id: { not: primaryStudent.id } } : {}),
        studentRegistrations: {
          some: primaryDepartmentId
            ? { batchSection: { batch: { program: { departmentId: { not: primaryDepartmentId } } } } }
            : {},
        },
      },
      select: studentSelect,
    });

    const secondSection = secondStudent?.studentRegistrations?.[0]?.batchSection ?? null;
    const secondHierarchy = toHierarchyFromSection(secondSection);

    const teacher = await prisma.user.findFirst({
      where: {
        OR: [{ role: { name: 'TEACHER' } }, { role: { name: 'LECTURER' } }],
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
        ? toUserDebugShape({ label: 'SUPER_ADMIN', userId: superAdmin.id, role: superAdmin.role.name })
        : null,
      dean: dean
        ? toUserDebugShape({
            label: 'DEAN',
            userId: dean.id,
            role: dean.role.name,
            facultyId: dean.deanProfile?.faculty?.id ?? null,
            hierarchy: { faculty: dean.deanProfile?.faculty ?? null },
          })
        : null,
      studentPrimary: primaryStudent
        ? toUserDebugShape({
            label: 'STUDENT_PRIMARY',
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
            label: 'STUDENT_DIFFERENT_DEPARTMENT',
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
            label: 'TEACHER',
            userId: teacher.id,
            role: teacher.role.name,
            facultyId: teacher.lecturerProfile?.department?.faculty?.id ?? null,
            departmentId: teacher.lecturerProfile?.department?.id ?? null,
            hierarchy: {
              faculty: teacher.lecturerProfile?.department?.faculty ?? null,
              department: teacher.lecturerProfile?.department
                ? { id: teacher.lecturerProfile.department.id, name: teacher.lecturerProfile.department.name }
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
    console.error('DEBUG announcement-test-users failed:', error);
    return res.status(500).json({ message: 'Failed to fetch announcement test users' });
  }
});

// ---------------------------------------------------------------------------
// GET /announcement-scope-check/:id — check a saved announcement's scope
// ---------------------------------------------------------------------------
router.get('/announcement-scope-check/:id', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid announcement id' });
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
      return res.status(404).json({ message: 'Announcement not found' });
    }

    return evaluateTargetAgainstUsers(announcement, res);
  } catch (error) {
    console.error('DEBUG announcement-scope-check/:id failed:', error);
    return res.status(500).json({ message: 'Failed to check announcement scope' });
  }
});

// ---------------------------------------------------------------------------
// POST /announcement-scope-check — check an ad-hoc target payload
// ---------------------------------------------------------------------------
router.post('/announcement-scope-check', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const targetType = String(req.body?.targetType ?? '').toUpperCase();
    if (!ALLOWED_TARGET_TYPES.has(targetType)) {
      return res.status(400).json({ message: 'Invalid targetType' });
    }

    const targetRoles = normalizeTargetRoles(req.body?.targetRoles);
    if (targetRoles.length === 0) {
      return res.status(400).json({ message: 'targetRoles is required' });
    }

    const target = {
      id: null,
      title: req.body?.title ?? 'debug-target',
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
    console.error('DEBUG announcement-scope-check failed:', error);
    return res.status(500).json({ message: 'Failed to check target scope' });
  }
});

// ---------------------------------------------------------------------------
// POST /discussion-memberships/sync — trigger membership sync
// ---------------------------------------------------------------------------
router.post('/discussion-memberships/sync', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const userId = req.body?.userId ? Number(req.body.userId) : null;
    if (userId) {
      const result = await syncDiscussionMembershipsForUser(userId);
      return res.json({ mode: 'single', result });
    }

    const results = await runDiscussionMembershipNightlySync();
    return res.json({ mode: 'nightly', syncedUsers: results.length });
  } catch (error) {
    console.error('DEBUG discussion-memberships/sync failed:', error);
    return res.status(500).json({ message: 'Failed to sync discussion memberships' });
  }
});

export default router;
