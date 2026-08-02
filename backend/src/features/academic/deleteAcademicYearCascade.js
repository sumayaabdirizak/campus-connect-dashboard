import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../utils/httpError.js';
import { archiveDiscussionGroupForScope } from '../discussions/groupProvisioning.service.js';
import { DISCUSSION_SCOPE_TYPES } from '../discussions/policy.js';
import { clearOfferingDependents } from './clearOfferingDependents.js';

/**
 * Hard-delete an academic year and year-scoped academic history
 * (offerings, registrations, batches/sections, semesters).
 */
export async function deleteAcademicYearCascade(yearId) {
  const id = Number(yearId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new HttpError(400, 'Invalid academic year id');
  }

  const year = await prisma.academicYear.findUnique({ where: { id } });
  if (!year) throw new HttpError(404, 'Academic year not found');

  const batches = await prisma.batch.findMany({
    where: { academicYearId: id },
    select: { id: true }
  });
  const batchIds = batches.map((b) => b.id);
  const sections = batchIds.length
    ? await prisma.batchSection.findMany({
        where: { batchId: { in: batchIds } },
        select: { id: true }
      })
    : [];
  const sectionIds = sections.map((s) => s.id);

  for (const batchId of batchIds) {
    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
      scopeId: batchId
    });
  }
  for (const sectionId of sectionIds) {
    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
      scopeId: sectionId
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.batch.updateMany({
      where: { graduationAcademicYearId: id },
      data: { graduationAcademicYearId: null }
    });
    await tx.studentRegistration.updateMany({
      where: { graduationAcademicYearId: id },
      data: { graduationAcademicYearId: null }
    });

    if (batchIds.length) {
      await tx.announcement.updateMany({
        where: { batchId: { in: batchIds } },
        data: { batchId: null }
      });
    }
    if (sectionIds.length) {
      await tx.announcement.updateMany({
        where: { sectionId: { in: sectionIds } },
        data: { sectionId: null }
      });
    }

    const offerings = await tx.courseOffering.findMany({
      where: {
        OR: [
          { academicYearId: id },
          ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : [])
        ]
      },
      select: { id: true }
    });
    const offeringIds = offerings.map((o) => o.id);
    await clearOfferingDependents(tx, offeringIds);
    if (offeringIds.length) {
      await tx.courseOffering.deleteMany({ where: { id: { in: offeringIds } } });
    }

    const semesters = await tx.semester.findMany({
      where: { academicYearId: id },
      select: { id: true }
    });
    const semesterIds = semesters.map((s) => s.id);

    await tx.studentRegistration.deleteMany({
      where: {
        OR: [
          { registrationAcademicYearId: id },
          { currentAcademicYearId: id },
          ...(semesterIds.length ? [{ currentSemesterId: { in: semesterIds } }] : []),
          ...(sectionIds.length ? [{ batchSectionId: { in: sectionIds } }] : [])
        ]
      }
    });

    if (sectionIds.length) {
      await tx.batchSection.deleteMany({ where: { id: { in: sectionIds } } });
    }
    if (batchIds.length) {
      await tx.batch.deleteMany({ where: { id: { in: batchIds } } });
    }
    if (semesterIds.length) {
      await tx.semester.deleteMany({ where: { id: { in: semesterIds } } });
    }

    await tx.academicYear.delete({ where: { id } });
  });

  return year;
}
