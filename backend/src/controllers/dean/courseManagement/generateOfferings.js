import { prisma } from "../../../db/prisma.js";
import { syncDiscussionMembershipsForUsers } from "../../../services/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { getFacultyProgramIds } from "../batchManagement/helpers.js";
import { getFacultyDepartmentIds } from "./helpers.js";

function pickSemester(semesters, curriculumSem) {
  const sorted = [...(semesters ?? [])].sort((a, b) => a.sequence - b.sequence);
  if (sorted.length === 0) return null;
  const n = Number(curriculumSem);
  if (Number.isFinite(n) && n > 0) {
    const exact = sorted.find((s) => s.sequence === n);
    if (exact) return exact;
    const slot = ((n - 1) % 2) + 1;
    return sorted[slot - 1] ?? sorted[0];
  }
  return sorted[0];
}

/**
 * Auto-create offerings for the dean's faculty:
 * active batch sections × courses whose semesterNumber matches batch.semester_number
 * (teachers must already be assigned). Skips duplicates.
 */
export const generateCourseOfferings = async (req, res) => {
  try {
    const { facultyId } = req;
    const [deptIds, programIds] = await Promise.all([
      getFacultyDepartmentIds(facultyId),
      getFacultyProgramIds(facultyId),
    ]);

    if (deptIds.length === 0 || programIds.length === 0) {
      return res.json({
        message: "No departments/programs in your faculty.",
        created: 0,
        skipped: 0,
      });
    }

    const [batches, courses] = await Promise.all([
      prisma.batch.findMany({
        where: { programId: { in: programIds }, status: "ACTIVE" },
        select: {
          id: true,
          academicYearId: true,
          semester_number: true,
          sections: { select: { id: true } },
          academicYear: {
            select: {
              id: true,
              semesters: { select: { id: true, sequence: true } },
            },
          },
        },
      }),
      prisma.course.findMany({
        where: {
          departmentId: { in: deptIds },
          semesterNumber: { not: null },
          teacherAssignings: { some: {} },
        },
        select: {
          id: true,
          semesterNumber: true,
          teacherAssignings: { select: { teacherId: true } },
        },
      }),
    ]);

    const coursesBySem = new Map();
    for (const c of courses) {
      const key = Number(c.semesterNumber);
      if (!coursesBySem.has(key)) coursesBySem.set(key, []);
      coursesBySem.get(key).push(c);
    }

    let created = 0;
    let skipped = 0;
    const teacherIds = new Set();

    for (const batch of batches) {
      const cohortSem = Number(batch.semester_number) || 1;
      const matching = coursesBySem.get(cohortSem) ?? [];
      if (matching.length === 0 || batch.sections.length === 0) continue;

      const semester = pickSemester(batch.academicYear?.semesters, cohortSem);
      if (!semester) continue;

      for (const section of batch.sections) {
        for (const course of matching) {
          try {
            await prisma.courseOffering.create({
              data: {
                courseId: course.id,
                sectionId: section.id,
                semesterId: semester.id,
                academicYearId: batch.academicYearId,
              },
            });
            created += 1;
            for (const t of course.teacherAssignings) {
              teacherIds.add(t.teacherId);
            }
          } catch (e) {
            if (e.code === "P2002") skipped += 1;
            else throw e;
          }
        }
      }
    }

    if (teacherIds.size > 0) {
      try {
        await syncDiscussionMembershipsForUsers([...teacherIds]);
      } catch (error) {
        console.error("Failed to sync memberships after generate offerings", {
          error: error?.message,
        });
      }
    }

    return res.json({
      message:
        created === 0 && skipped === 0
          ? "Nothing to generate. Ensure batches are active, courses have a semester + teachers, and semester numbers match."
          : `Created ${created} offering(s). ${skipped} already existed.`,
      created,
      skipped,
    });
  } catch (e) {
    respondInternalError(res, "Failed to generate offerings", e);
  }
};
