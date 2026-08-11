import { prisma } from "../../../db/prisma.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertFacultySection } from "../batchManagement/helpers.js";
import { getFacultyDepartmentIds } from "./helpers.js";

const SLOT_ORDER = ["SLOT_1", "SLOT_2", "SLOT_3", "SLOT_4"];
const DAY_ORDER = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"];

/**
 * GET /dean/sessions/heatmap?sectionId=123
 * How many ClassSessions land on each day/slot — across the dean's whole
 * faculty by default, or narrowed to one section's timetable when
 * `sectionId` is given. Each cell also lists the course codes meeting then,
 * so a day column can show "all sessions that day" on hover.
 */
export const getSessionsHeatmap = async (req, res) => {
  try {
    const { facultyId } = req;
    const { sectionId, batchId, departmentId } = req.query;

    const deptIds = await getFacultyDepartmentIds(facultyId);

    const sectionFilter = {};
    if (sectionId) {
      const section = await assertFacultySection(sectionId, facultyId, res);
      if (!section) return;
      sectionFilter.id = Number(sectionId);
    }
    if (batchId) {
      sectionFilter.batchId = Number(batchId);
    }

    const programFilter = {};
    if (departmentId) {
      programFilter.departmentId = Number(departmentId);
    } else {
      programFilter.departmentId = { in: deptIds };
    }

    const where = {
      courseOffering: {
        section: {
          ...sectionFilter,
          batch: {
            program: programFilter,
          },
        },
      },
    };

    const rows = await prisma.classSession.findMany({
      where,
      select: {
        dayOfWeek: true,
        timeSlot: true,
        courseOffering: {
          select: {
            course: { select: { code: true, name: true } },
            section: { select: { name: true, batch: { select: { name: true } } } },
          },
        },
      },
    });

    const cells = DAY_ORDER.flatMap((day) =>
      SLOT_ORDER.map((slot) => {
        const matches = rows.filter((r) => r.dayOfWeek === day && r.timeSlot === slot);
        return {
          day,
          slot,
          count: matches.length,
          courses: matches.map((m) => m.courseOffering.course.code),
          sessions: matches.map((m) => ({
            courseCode: m.courseOffering.course.code,
            courseName: m.courseOffering.course.name,
            batch: m.courseOffering.section.batch.name,
            section: m.courseOffering.section.name,
          })),
        };
      })
    );

    res.json({ cells, max: Math.max(0, ...cells.map((c) => c.count)) });
  } catch (e) {
    respondInternalError(res, "Failed to fetch sessions heatmap", e);
  }
};

async function loadOfferingInFacultyScope(offeringId, facultyId, res) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: Number(offeringId) },
    include: {
      course: { include: { teacherAssignings: { select: { teacherId: true } } } },
      section: true,
    },
  });
  if (!offering) {
    res.status(404).json({ message: "Offering not found." });
    return null;
  }
  const section = await assertFacultySection(offering.sectionId, facultyId, res);
  if (!section) return null;
  return offering;
}

export const getSessionsForOffering = async (req, res) => {
  try {
    const { facultyId } = req;
    const { offeringId } = req.params;

    const offering = await loadOfferingInFacultyScope(offeringId, facultyId, res);
    if (!offering) return;

    const sessions = await prisma.classSession.findMany({
      where: { courseOfferingId: offering.id },
    });

    res.json({
      sessions: sessions.sort(
        (a, b) =>
          DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek) ||
          SLOT_ORDER.indexOf(a.timeSlot) - SLOT_ORDER.indexOf(b.timeSlot)
      ),
      teacherId: offering.teacherId,
    });
  } catch (e) {
    respondInternalError(res, "Failed to fetch sessions", e);
  }
};

export const saveSessionsForOffering = async (req, res) => {
  try {
    const { facultyId } = req;
    const { offeringId } = req.params;
    const { sessions, note, teacherId } = req.body;

    if (!Array.isArray(sessions)) {
      return res.status(400).json({ message: "sessions must be an array." });
    }
    for (const s of sessions) {
      if (!DAY_ORDER.includes(s.dayOfWeek) || !SLOT_ORDER.includes(s.timeSlot)) {
        return res.status(400).json({ message: "Invalid dayOfWeek or timeSlot." });
      }
    }

    const offering = await loadOfferingInFacultyScope(offeringId, facultyId, res);
    if (!offering) return;

    // Scheduling a session is where course + teacher actually get tied
    // together — auto-create the TeacherAssigning here rather than requiring
    // a separate trip to Catalogue/Teachers beforehand.
    let resolvedTeacherId = offering.teacherId;
    if (teacherId !== undefined) {
      if (teacherId === null) {
        resolvedTeacherId = null;
      } else {
        resolvedTeacherId = Number(teacherId);
        const isAssigned = offering.course.teacherAssignings.some(
          (t) => t.teacherId === resolvedTeacherId
        );
        if (!isAssigned) {
          await prisma.teacherAssigning.upsert({
            where: { teacherId_courseId: { teacherId: resolvedTeacherId, courseId: offering.courseId } },
            create: { teacherId: resolvedTeacherId, courseId: offering.courseId },
            update: {},
          });
        }
      }
    }

    if (sessions.length > 0 && resolvedTeacherId) {
      const conflicting = await prisma.classSession.findMany({
        where: {
          courseOfferingId: { not: offering.id },
          OR: sessions.map((s) => ({ dayOfWeek: s.dayOfWeek, timeSlot: s.timeSlot })),
          courseOffering: {
            OR: [{ teacherId: resolvedTeacherId }, { sectionId: offering.sectionId }],
          },
        },
        include: {
          courseOffering: {
            include: { course: { select: { code: true, name: true } } },
          },
        },
      });

      const requested = new Set(sessions.map((s) => `${s.dayOfWeek}|${s.timeSlot}`));
      const conflicts = conflicting
        .filter((c) => requested.has(`${c.dayOfWeek}|${c.timeSlot}`))
        .map((c) => ({
          dayOfWeek: c.dayOfWeek,
          timeSlot: c.timeSlot,
          course: c.courseOffering.course.code,
        }));

      if (conflicts.length > 0) {
        return res.status(409).json({
          message: "Schedule conflict — teacher or section already booked at this time.",
          conflicts,
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (teacherId !== undefined) {
        await tx.courseOffering.update({
          where: { id: offering.id },
          data: { teacherId: resolvedTeacherId },
        });
      }
      await tx.classSession.deleteMany({ where: { courseOfferingId: offering.id } });
      if (sessions.length > 0) {
        await tx.classSession.createMany({
          data: sessions.map((s) => ({
            courseOfferingId: offering.id,
            dayOfWeek: s.dayOfWeek,
            timeSlot: s.timeSlot,
            note: note || null,
          })),
        });
      }
      return tx.classSession.findMany({ where: { courseOfferingId: offering.id } });
    });

    res.json({
      message: `Saved ${updated.length} session(s).`,
      sessions: updated.sort(
        (a, b) =>
          DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek) ||
          SLOT_ORDER.indexOf(a.timeSlot) - SLOT_ORDER.indexOf(b.timeSlot)
      ),
      teacherId: resolvedTeacherId,
    });
  } catch (e) {
    respondInternalError(res, "Failed to save sessions", e);
  }
};
