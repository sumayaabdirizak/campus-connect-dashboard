import { prisma } from '../../../db/prisma.js';
import { env } from '../../../config/env.js';
import { hashPassword } from '../../../utils/password.js';
import { syncDiscussionMembershipsForUser } from '../../discussions/membershipSync.service.js';
import { getAcademicInfoSystemAdapter } from './index.js';
import { JazeeraUniversityAdapter } from './JazeeraUniversityAdapter.js';

/** Placeholder email when university dean profile has no mailbox. */
export function buildDeanSyncEmail(username) {
  const safe = String(username ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `dean+${safe || 'dean'}@campus-connect.internal`;
}

async function resolveLocalFacultyForDean({
  aisFacultyIds,
  facultyCode,
  facultiesFromApi,
}) {
  if (facultyCode) {
    const byCode = await prisma.faculty.findFirst({
      where: { code: { equals: String(facultyCode).trim(), mode: 'insensitive' } },
    });
    if (byCode) return byCode;
  }

  const all = await prisma.faculty.findMany({
    select: { id: true, code: true, name: true },
  });
  if (all.length === 1) return all[0];

  for (const aisId of aisFacultyIds ?? []) {
    const apiFac = (facultiesFromApi ?? []).find(
      (f) => Number(f.id ?? f.facultyId) === Number(aisId)
    );
    if (!apiFac) continue;

    const codes = [apiFac.FacID, apiFac.code, apiFac.FacCode].filter(Boolean);
    for (const c of codes) {
      const hit = await prisma.faculty.findFirst({
        where: { code: { equals: String(c), mode: 'insensitive' } },
      });
      if (hit) return hit;
    }
  }

  return all[0] ?? null;
}

/**
 * Upsert the configured university dean as a local DEAN user (login via username / number).
 *
 * Uses UNIVERSITY_DEAN_USERNAME + UNIVERSITY_DEAN_PASSWORD for API profile;
 * password hash is taken from UNIVERSITY_DEAN_PASSWORD.
 */
export async function syncDeanFromAis(opts = {}) {
  const { dryRun = false, facultyCode, updatePassword = true } = opts;

  const deanPassword = env.UNIVERSITY_DEAN_PASSWORD;
  if (!dryRun && !deanPassword) {
    throw new Error('Set UNIVERSITY_DEAN_PASSWORD for dean sync');
  }
  if (!dryRun && String(deanPassword).length < 8) {
    throw new Error('UNIVERSITY_DEAN_PASSWORD must be at least 8 characters');
  }

  const adapter = getAcademicInfoSystemAdapter();
  if (!(adapter instanceof JazeeraUniversityAdapter)) {
    throw new Error('Jazeera adapter not active');
  }

  const overview = await adapter.getDeanOverview();
  if (!overview.deanLogin) {
    throw new Error(overview.reason || 'Dean login failed');
  }

  const profile = overview.profile ?? {};
  const username = String(
    profile.username ?? env.UNIVERSITY_DEAN_USERNAME ?? ''
  ).trim();
  const fullName = String(profile.name ?? username).trim();
  const allowedFaculties = overview.allowedFaculties ?? [];
  const aisFacultyIds = allowedFaculties.map((id) => Number(id)).filter((n) => Number.isFinite(n));
  const facultiesFromApi = Array.isArray(overview.faculties)
    ? overview.faculties
    : overview.faculties?.faculties ?? [];

  if (!username) {
    throw new Error('Dean profile missing username from university API');
  }

  const localFaculty = await resolveLocalFacultyForDean({
    aisFacultyIds,
    facultyCode,
    facultiesFromApi,
  });

  if (!localFaculty) {
    throw new Error(
      'No local faculty found — run student sync first or pass facultyCode (e.g. EMS)'
    );
  }

  const existingFacultyDean = await prisma.deanProfile.findUnique({
    where: { facultyId: localFaculty.id },
    include: { user: { select: { id: true, number: true, email: true } } },
  });

  const deanRole = await prisma.role.findUnique({ where: { name: 'DEAN' } });
  if (!deanRole) {
    throw new Error('DEAN role is missing in database');
  }

  const email = buildDeanSyncEmail(username);
  const password_hash = dryRun ? null : await hashPassword(String(deanPassword));

  const summary = {
    dryRun,
    username,
    fullName,
    email,
    localFacultyId: localFaculty.id,
    localFacultyCode: localFaculty.code,
    aisFacultyIds,
    created: false,
    updated: false,
    userId: null,
  };

  if (dryRun) {
    const existing = await prisma.user.findUnique({ where: { number: username } });
    summary.created = !existing;
    summary.updated = Boolean(existing);
    return summary;
  }

  let user = await prisma.user.findUnique({
    where: { number: username },
    include: { role: true, deanProfile: true },
  });

  if (!user && existingFacultyDean?.userId) {
    user = await prisma.user.findUnique({
      where: { id: existingFacultyDean.userId },
      include: { role: true, deanProfile: true },
    });
  }

  if (user) {
    const emailConflict = await prisma.user.findFirst({
      where: { email, NOT: { id: user.id } },
      select: { id: true },
    });
    const data = {
      full_name: fullName,
      number: username,
      roleId: deanRole.id,
      status: 'ACTIVE',
    };
    if (!emailConflict) data.email = email;
    if (updatePassword) data.password_hash = password_hash;

    await prisma.user.update({ where: { id: user.id }, data });
    summary.updated = true;
    user = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true, deanProfile: true },
    });
  } else {
    const numberConflict = await prisma.user.findUnique({ where: { number: username } });
    if (numberConflict) {
      throw new Error(`University ID "${username}" is already used by another account`);
    }
    const emailConflict = await prisma.user.findUnique({ where: { email } });
    if (emailConflict) {
      throw new Error(`Email "${email}" is already registered`);
    }

    user = await prisma.user.create({
      data: {
        full_name: fullName,
        email,
        number: username,
        password_hash,
        roleId: deanRole.id,
        status: 'ACTIVE',
        must_change_password: false,
      },
      include: { role: true, deanProfile: true },
    });
    summary.created = true;
  }

  if (!user.deanProfile) {
    await prisma.deanProfile.create({
      data: { userId: user.id, facultyId: localFaculty.id },
    });
  } else if (user.deanProfile.facultyId !== localFaculty.id) {
    await prisma.deanProfile.update({
      where: { userId: user.id },
      data: { facultyId: localFaculty.id },
    });
  }

  await prisma.faculty.update({
    where: { id: localFaculty.id },
    data: { deanId: user.id },
  });

  try {
    await syncDiscussionMembershipsForUser(user.id);
  } catch {
    // best-effort
  }

  summary.userId = user.id;
  return summary;
}
