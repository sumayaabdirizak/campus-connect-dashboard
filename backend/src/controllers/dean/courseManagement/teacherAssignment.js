import { prisma } from "../../../db/prisma.js";
import { syncDiscussionMembershipsForUser } from "../../../services/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertFacultyCourse } from "./helpers.js";

export const assignTeacherToCourse = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { teacherId } = req.body;
    const { facultyId } = req;

    if (!teacherId) return res.status(400).json({ message: "teacherId is required." });

    const course = await assertFacultyCourse(courseId, facultyId, res);
    if (!course) return;

    const teacher = await prisma.user.findFirst({
      where: {
        id: Number(teacherId),
        lecturerProfile: { faculties: { some: { facultyId } } },
      },
    });
    if (!teacher) {
      return res.status(403).json({ message: "Teacher is not affiliated with your faculty." });
    }

    const assigning = await prisma.teacherAssigning.create({
      data: {
        teacherId: Number(teacherId),
        courseId: Number(courseId),
      },
      include: {
        teacher: { select: { id: true, full_name: true, email: true } },
        course: { select: { id: true, name: true, code: true } },
      },
    });

    try {
      await syncDiscussionMembershipsForUser(Number(teacherId));
    } catch (error) {
      console.error("Failed to sync memberships after teacher course assignment", {
        teacherId: Number(teacherId),
        courseId: Number(courseId),
        error: error?.message,
      });
    }

    res.status(201).json({ message: "Teacher assigned to course", assignment: assigning });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ message: "Teacher is already assigned to this course." });
    }
    respondInternalError(res, "Failed to assign teacher", e);
  }
};

export const removeTeacherFromCourse = async (req, res) => {
  try {
    const { id: courseId, teacherId } = req.params;
    const { facultyId } = req;

    const course = await assertFacultyCourse(courseId, facultyId, res);
    if (!course) return;

    const record = await prisma.teacherAssigning.findFirst({
      where: { courseId: Number(courseId), teacherId: Number(teacherId) },
    });
    if (!record) return res.status(404).json({ message: "Teacher assignment not found." });

    await prisma.teacherAssigning.delete({ where: { id: record.id } });

    try {
      await syncDiscussionMembershipsForUser(Number(teacherId));
    } catch (error) {
      console.error("Failed to sync memberships after teacher removal from course", {
        teacherId: Number(teacherId),
        courseId: Number(courseId),
        error: error?.message,
      });
    }

    res.json({ message: "Teacher removed from course." });
  } catch (e) {
    respondInternalError(res, "Failed to remove teacher", e);
  }
};
