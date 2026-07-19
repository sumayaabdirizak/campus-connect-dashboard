/**
 * Shared helper utilities for the announcement debug routes.
 */
import { prisma } from '../../db/prisma.js';
import { canUserSeeAnnouncement } from '../../features/announcements/services/announcementVisibility.service.js';
import { loadUserAnnouncementScope } from '../../utils/userAnnouncementScope.js';

export const ALLOWED_TARGET_TYPES = new Set(['ALL', 'FACULTY', 'DEPARTMENT', 'BATCH', 'SECTION']);

export function normalizeTargetRoles(input) {
  const list = Array.isArray(input) ? input : input != null ? [input] : [];
  return Array.from(
    new Set(
      list
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

export function toNumberOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toHierarchyFromSection(section) {
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

export function toUserDebugShape({ label, userId, role, facultyId = null, departmentId = null, batchId = null, sectionId = null, hierarchy = null }) {
  return { label, userId, role, facultyId, departmentId, batchId, sectionId, hierarchy };
}

export function logDebugUser(userData) {
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

export async function evaluateTargetAgainstUsers(target, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      role: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
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
