/**
 * GET /group-dms/member-candidates — people sharing a faculty server,
 * enriched with department / batch / section for hierarchy UI.
 */

import { prisma } from '../../../db/prisma.js';
import { apiErrorBody } from '../../../utils/apiEnvelope.js';
import { getDiscussionCallerUserId } from '../../../services/discussions/discussionCaller.js';
import {
  assertUserCanUseDms,
  assertUserCanUseGroupDms,
  directDmTargetRolesFor,
  GROUP_DM_ROLE_NAMES,
  listActiveFacultyServerIds,
} from '../../../services/discussions/groupDmEligibility.js';
import { enrichCandidateDepartment } from './enrichCandidateDepartment.js';
import { listDeanCandidatesForAo } from './listDeanCandidatesForAo.js';
import { listOfficeStaffDirectCandidates } from './listOfficeStaffDirectCandidates.js';
import { listFacultyDeanOfficeStaffCandidates } from '../../../services/discussions/deanOfficeStaffDm.js';
import { listStudentTeacherDirectCandidates } from './listStudentTeacherDirectCandidates.js';
import { listUniversityRoleCandidates } from './listUniversityRoleCandidates.js';

const CANDIDATE_USER_SELECT = {
  id: true,
  full_name: true,
  email: true,
  role: { select: { name: true } },
  studentProfile: { select: { departmentId: true } },
  lecturerProfile: {
    select: {
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
    },
  },
  deanProfile: {
    select: { faculty: { select: { name: true, code: true } } },
  },
  studentRegistrations: {
    where: { status: 'ACTIVE' },
    take: 1,
    orderBy: { id: 'desc' },
    select: {
      status: true,
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
                  department: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      },
    },
  },
};

/** @param {import('express').Router} router */
export function register(router) {
  router.get('/group-dms/member-candidates', async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody('Unauthorized', null));

      const purpose =
        String(req.query.purpose ?? 'direct').toLowerCase() === 'group'
          ? 'group'
          : 'direct';

      const gate =
        purpose === 'group'
          ? await assertUserCanUseGroupDms(userId)
          : await assertUserCanUseDms(userId);
      if (!gate.ok) {
        return res.status(gate.status).json(apiErrorBody(gate.message, { code: gate.code }));
      }

      const allowedRoles =
        purpose === 'group'
          ? gate.user.roleName === 'DEAN'
            ? ['TEACHER', 'STUDENT', 'OFFICE_STAFF']
            : [...GROUP_DM_ROLE_NAMES]
          : [...directDmTargetRolesFor(gate.user.roleName)];

      if (allowedRoles.length === 0) return res.json({ results: [] });

      const q = String(req.query.q ?? '')
        .trim()
        .slice(0, 80);

      // Academic Office: university-wide deans + office staff.
      if (purpose === 'group' && gate.user.roleName === 'ACADEMIC_OFFICE') {
        const raw = await listDeanCandidatesForAo(userId, q, prisma, CANDIDATE_USER_SELECT);
        return res.json({
          results: raw.map((u) => enrichCandidateDepartment(u, new Map())),
        });
      }

      // Academic Office 1:1 — deans only, university-wide.
      if (purpose === 'direct' && gate.user.roleName === 'ACADEMIC_OFFICE') {
        const raw = await listUniversityRoleCandidates(userId, q, ['DEAN'], prisma, CANDIDATE_USER_SELECT);
        return res.json({
          results: raw.map((u) => enrichCandidateDepartment(u, new Map())),
          dmScope: 'university',
        });
      }

      // Office Staff 1:1 — university desk = university-wide; faculty desk = faculty only.
      if (purpose === 'direct' && gate.user.roleName === 'OFFICE_STAFF') {
        const { results, dmScope } = await listOfficeStaffDirectCandidates(
          userId,
          q,
          allowedRoles,
          prisma,
          CANDIDATE_USER_SELECT
        );
        return res.json({ results, dmScope });
      }

      // Student ↔ course teachers / teacher ↔ their students (+ dean for teachers).
      if (
        purpose === 'direct' &&
        (gate.user.roleName === 'STUDENT' || gate.user.roleName === 'TEACHER')
      ) {
        const { results, dmScope } = await listStudentTeacherDirectCandidates(
          userId,
          gate.user.roleName,
          q,
          prisma,
          CANDIDATE_USER_SELECT
        );
        return res.json({ results, dmScope });
      }

      const isDean = gate.user.roleName === 'DEAN';
      const facultyRoles = allowedRoles.filter(
        (r) => r !== 'OFFICE_STAFF' && r !== 'ACADEMIC_OFFICE'
      );
      const wantOfficeStaff = allowedRoles.includes('OFFICE_STAFF');
      const wantAcademicOffice = allowedRoles.includes('ACADEMIC_OFFICE');

      const serverIds =
        facultyRoles.length > 0 ? await listActiveFacultyServerIds(userId) : [];

      const seen = new Set();
      const raw = [];

      if (serverIds.length > 0 && facultyRoles.length > 0) {
        const memberRows = await prisma.discussionGroupMembership.findMany({
          where: {
            groupId: { in: serverIds },
            leftAt: null,
            isActive: true,
            userId: { not: userId },
            user: {
              status: 'ACTIVE',
              role: { name: { in: facultyRoles } },
              ...(q
                ? {
                    OR: [
                      { full_name: { contains: q, mode: 'insensitive' } },
                      { email: { contains: q, mode: 'insensitive' } },
                    ],
                  }
                : {}),
            },
          },
          select: {
            userId: true,
            user: { select: CANDIDATE_USER_SELECT },
          },
          take: 400,
          orderBy: { joinedAt: 'desc' },
        });

        for (const row of memberRows) {
          const uid = Number(row.userId);
          if (seen.has(uid) || !row.user) continue;
          seen.add(uid);
          raw.push(row.user);
          if (raw.length >= 250) break;
        }
      }

      if (isDean && wantOfficeStaff && raw.length < 250) {
        const staff = await listFacultyDeanOfficeStaffCandidates(
          userId,
          q,
          CANDIDATE_USER_SELECT,
          prisma
        );
        for (const u of staff) {
          const uid = Number(u.id);
          if (seen.has(uid)) continue;
          seen.add(uid);
          raw.push(u);
          if (raw.length >= 250) break;
        }
      }

      if (isDean && wantAcademicOffice && raw.length < 250) {
        const aoStaff = await listUniversityRoleCandidates(
          userId,
          q,
          ['ACADEMIC_OFFICE'],
          prisma,
          CANDIDATE_USER_SELECT
        );
        for (const u of aoStaff) {
          const uid = Number(u.id);
          if (seen.has(uid)) continue;
          seen.add(uid);
          raw.push(u);
          if (raw.length >= 250) break;
        }
      }

      if (raw.length === 0) return res.json({ results: [] });

      const studentDeptIds = [
        ...new Set(
          raw
            .map((u) => u.studentProfile?.departmentId)
            .filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
            .map(Number)
        ),
      ];
      const deptRows =
        studentDeptIds.length > 0
          ? await prisma.department.findMany({
              where: { id: { in: studentDeptIds } },
              select: { id: true, name: true, code: true },
            })
          : [];
      const deptById = new Map(deptRows.map((d) => [d.id, d]));

      return res.json({
        results: raw.map((u) => enrichCandidateDepartment(u, deptById)),
      });
    } catch (error) {
      console.error('GET /discussions/group-dms/member-candidates failed', error);
      return res.status(500).json(apiErrorBody('Failed to load candidates', null));
    }
  });
}
