import { prisma } from '../../db/prisma.js';
import {
  UNIVERSITY_SUPPORT_OFFICES,
  deanOfficeDefForFaculty,
} from './defaultSupportOffices.js';
import { syncDeanToFacultyOffice } from './syncDeanToFacultyOffice.js';

async function upsertUniversityOffice(def) {
  const existing = await prisma.supportOffice.findUnique({ where: { slug: def.slug } });
  if (existing) {
    return prisma.supportOffice.update({
      where: { slug: def.slug },
      data: {
        name: def.name,
        description: def.description,
        codePrefix: def.codePrefix,
        facultyId: null,
        isActive: true,
      },
    });
  }
  return prisma.supportOffice.create({
    data: {
      name: def.name,
      slug: def.slug,
      description: def.description,
      codePrefix: def.codePrefix,
      facultyId: null,
      isActive: true,
    },
  });
}

/** Create or refresh a faculty Dean's Office, preferring facultyId then slug. */
async function upsertDeanOffice(faculty) {
  const def = deanOfficeDefForFaculty(faculty);
  const byFaculty = await prisma.supportOffice.findUnique({
    where: { facultyId: faculty.id },
  });
  if (byFaculty) {
    return prisma.supportOffice.update({
      where: { id: byFaculty.id },
      data: {
        name: def.name,
        description: def.description,
        codePrefix: def.codePrefix,
        isActive: true,
      },
    });
  }

  const bySlug = await prisma.supportOffice.findUnique({ where: { slug: def.slug } });
  if (bySlug) {
    return prisma.supportOffice.update({
      where: { id: bySlug.id },
      data: {
        name: def.name,
        description: def.description,
        codePrefix: def.codePrefix,
        facultyId: faculty.id,
        isActive: true,
      },
    });
  }

  return prisma.supportOffice.create({
    data: {
      name: def.name,
      slug: def.slug,
      description: def.description,
      codePrefix: def.codePrefix,
      facultyId: faculty.id,
      isActive: true,
    },
  });
}

/**
 * Upsert university desks + one Dean's Office per faculty; sync Dean managers.
 * Deactivates the legacy flat `deans-office` slug (no faculty).
 * @returns {Promise<{ created: number, updated: number, offices: object[] }>}
 */
export async function ensureDefaultSupportOffices() {
  let created = 0;
  let updated = 0;
  const offices = [];

  for (const def of UNIVERSITY_SUPPORT_OFFICES) {
    const before = await prisma.supportOffice.findUnique({ where: { slug: def.slug } });
    const office = await upsertUniversityOffice(def);
    if (before) updated += 1;
    else created += 1;
    offices.push(office);
  }

  const legacy = await prisma.supportOffice.findUnique({ where: { slug: 'deans-office' } });
  if (legacy && legacy.facultyId == null) {
    await prisma.supportOffice.update({
      where: { id: legacy.id },
      data: { isActive: false },
    });
  }

  const faculties = await prisma.faculty.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  for (const faculty of faculties) {
    const before = await prisma.supportOffice.findUnique({
      where: { facultyId: faculty.id },
    });
    const office = await upsertDeanOffice(faculty);
    if (before) updated += 1;
    else created += 1;
    offices.push(office);
  }

  const deans = await prisma.deanProfile.findMany({
    select: { userId: true, facultyId: true },
  });
  for (const d of deans) {
    await syncDeanToFacultyOffice(d.userId, d.facultyId);
  }

  return { created, updated, offices };
}
