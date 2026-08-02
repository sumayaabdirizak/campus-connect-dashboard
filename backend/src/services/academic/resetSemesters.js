import { prisma } from "../../db/prisma.js";
import {
  buildDefaultSemesterRows,
  getCurrentAcademicYearBounds,
} from "./academicCalendar.js";
import { ACTIVE_ACADEMIC_YEAR_WINDOW } from "./ensureSemesterCount.js";

/** Best-effort wipe of course-offering dependents that block offering delete. */
async function clearCourseOfferingDependents() {
  const steps = [
    () => prisma.quizAnswer?.deleteMany?.({}),
    () => prisma.quizOption?.deleteMany?.({}),
    () => prisma.quizAttempt?.deleteMany?.({}),
    () => prisma.quizQuestion?.deleteMany?.({}),
    () => prisma.submissionExtension?.deleteMany?.({}),
    () => prisma.submission?.deleteMany?.({}),
    () => prisma.assignmentAttachment?.deleteMany?.({}),
    () => prisma.assignment?.deleteMany?.({}),
    () => prisma.groupMember?.deleteMany?.({}),
    () => prisma.courseGroup?.deleteMany?.({}),
    () => prisma.coursePostReaction?.deleteMany?.({}),
    () => prisma.coursePostReply?.deleteMany?.({}),
    () => prisma.coursePostAttachment?.deleteMany?.({}),
    () => prisma.coursePost?.deleteMany?.({}),
    () => prisma.courseOfferingAccess?.deleteMany?.({}),
    () => prisma.resourceView?.deleteMany?.({}),
    () => prisma.resource?.deleteMany?.({}),
    () => prisma.question?.deleteMany?.({}),
    () => prisma.quiz?.deleteMany?.({}),
    () => prisma.courseModule?.deleteMany?.({}),
    () => prisma.chatMessageMention?.deleteMany?.({}),
    () => prisma.chatAttachment?.deleteMany?.({}),
    () => prisma.chatMessage?.updateMany?.({ data: { replyToId: null } }),
    () => prisma.chatMessage?.deleteMany?.({}),
    () => prisma.chatRoom?.deleteMany?.({}),
  ];

  for (const step of steps) {
    try {
      await step();
    } catch {
      // Model may not exist or already empty — continue.
    }
  }
}

/**
 * Wipe all semesters and rebuild exactly 6 active years × 2 = 12 clean semesters.
 */
export async function resetToCleanTwelveSemesters() {
  await clearCourseOfferingDependents();

  const offeringCount = await prisma.courseOffering.count();
  const registrationCount = await prisma.studentRegistration.count();

  await prisma.courseOffering.deleteMany({});
  await prisma.studentRegistration.deleteMany({});
  await prisma.semester.deleteMany({});

  const { startYear: currentStart } = getCurrentAcademicYearBounds(new Date());
  const firstStart = currentStart - (ACTIVE_ACADEMIC_YEAR_WINDOW - 1);

  let sequence = 1;
  const created = [];

  for (let y = firstStart; y <= currentStart; y += 1) {
    const bounds = getCurrentAcademicYearBounds(new Date(y, 8, 1));
    let year = await prisma.academicYear.findUnique({ where: { name: bounds.name } });
    if (!year) {
      year = await prisma.academicYear.create({
        data: {
          name: bounds.name,
          start_date: bounds.startDate,
          end_date: bounds.endDate,
        },
      });
    } else {
      year = await prisma.academicYear.update({
        where: { id: year.id },
        data: {
          start_date: bounds.startDate,
          end_date: bounds.endDate,
        },
      });
    }

    const rows = buildDefaultSemesterRows(
      {
        ...bounds,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
      },
      sequence
    ).map((row) => ({ ...row, academicYearId: year.id }));

    await prisma.semester.createMany({ data: rows });
    created.push(
      ...rows.map((r) => ({
        sequence: r.sequence,
        name: r.name,
        year: year.name,
      }))
    );
    sequence += 2;
  }

  return {
    deletedOfferings: offeringCount,
    deletedRegistrations: registrationCount,
    semesters: created,
    totalSemesters: created.length,
    activeYears: created
      .map((s) => s.year)
      .filter((name, index, arr) => arr.indexOf(name) === index),
  };
}
