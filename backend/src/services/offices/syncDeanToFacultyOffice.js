import { prisma } from '../../db/prisma.js';
import { deanOfficeDefForFaculty } from './defaultSupportOffices.js';

/**
 * Ensure this user is MANAGER of the faculty's Dean's Office desk.
 * Creates the office if missing. No-op when facultyId is invalid.
 * @param {number} userId
 * @param {number} facultyId
 */
export async function syncDeanToFacultyOffice(userId, facultyId) {
  const uid = Number(userId);
  const fid = Number(facultyId);
  if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(fid) || fid <= 0) return null;

  const faculty = await prisma.faculty.findUnique({
    where: { id: fid },
    select: { id: true, name: true, code: true },
  });
  if (!faculty) return null;

  const def = deanOfficeDefForFaculty(faculty);
  let office = await prisma.supportOffice.findUnique({ where: { facultyId: fid } });
  if (!office) {
    const bySlug = await prisma.supportOffice.findUnique({ where: { slug: def.slug } });
    if (bySlug) {
      office = await prisma.supportOffice.update({
        where: { id: bySlug.id },
        data: {
          name: def.name,
          description: def.description,
          codePrefix: def.codePrefix,
          facultyId: fid,
          isActive: true,
        },
      });
    } else {
      office = await prisma.supportOffice.create({
        data: {
          name: def.name,
          slug: def.slug,
          description: def.description,
          codePrefix: def.codePrefix,
          facultyId: fid,
          isActive: true,
        },
      });
    }
  } else {
    office = await prisma.supportOffice.update({
      where: { id: office.id },
      data: {
        name: def.name,
        description: def.description,
        codePrefix: def.codePrefix,
        isActive: true,
      },
    });
  }

  await prisma.supportOfficeStaff.upsert({
    where: { officeId_userId: { officeId: office.id, userId: uid } },
    create: { officeId: office.id, userId: uid, role: 'MANAGER' },
    update: { role: 'MANAGER' },
  });

  return office;
}
