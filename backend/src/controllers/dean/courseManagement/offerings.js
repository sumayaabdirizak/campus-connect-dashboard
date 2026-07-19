import { prisma } from "../../../db/prisma.js";
import {
  syncDiscussionMembershipsForUsers,
} from "../../../features/discussions/membershipSync.service.js";
import { namedListSuccess } from "../../../utils/apiEnvelope.js";
import { parsePaginationQuery } from "../../../utils/pagination.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertFacultyCourse, getFacultyDepartmentIds } from "./helpers.js";

export const getCourseOfferings = async (req, res) => {
  try {
    const { facultyId } = req;
    const { courseId, sectionId, semesterId, academicYearId } = req.query;
    const deptIds = await getFacultyDepartmentIds(facultyId);
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const where = {
      course: { departmentId: { in: deptIds } },
      ...(courseId ? { courseId: Number(courseId) } : {}),
      ...(sectionId ? { sectionId: Number(sectionId) } : {}),
      ...(semesterId ? { semesterId: Number(semesterId) } : {}),
      ...(academicYearId ? { academicYearId: Number(academicYearId) } : {}),
    };

    const [totalCount, offerings] = await Promise.all([
      prisma.courseOffering.count({ where }),
      prisma.courseOffering.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              name: true,
              code: true,
              credits: true,
              teacherAssignings: {
                include: { teacher: { select: { id: true, full_name: true } } },
              },
            },
          },
          section: {
            include: { batch: { include: { program: { select: { name: true } } } } },
          },
          semester: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    res.json(
      namedListSuccess({
        message: "Offerings fetched",
        name: "offerings",
        items: offerings,
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (e) {
    respondInternalError(res, "Failed to fetch offerings", e);
  }
};

export const createCourseOffering = async (req, res) => {
  try {
    const { facultyId } = req;
    const { courseId, sectionId, semesterId, academicYearId } = req.body;

    if (!courseId || !sectionId || !semesterId || !academicYearId) {
      return res
        .status(400)
        .json({ message: "courseId, sectionId, semesterId, academicYearId are required." });
    }

    const course = await assertFacultyCourse(courseId, facultyId, res);
    if (!course) return;

    const deptIds = await getFacultyDepartmentIds(facultyId);
    const section = await prisma.batchSection.findFirst({
      where: {
        id: Number(sectionId),
        batch: { program: { departmentId: { in: deptIds } } },
      },
      include: { batch: { include: { program: true } } },
    });
    if (!section) {
      return res.status(403).json({ message: "Section does not belong to your faculty." });
    }

    const teacherCount = await prisma.teacherAssigning.count({ where: { courseId: Number(courseId) } });
    if (teacherCount === 0) {
      return res.status(400).json({
        message: "Assign at least one teacher to this course before creating an offering.",
      });
    }

    const offering = await prisma.courseOffering.create({
      data: {
        courseId: Number(courseId),
        sectionId: Number(sectionId),
        semesterId: Number(semesterId),
        academicYearId: Number(academicYearId),
      },
      include: {
        course: {
          select: {
            name: true,
            code: true,
            credits: true,
            teacherAssignings: { include: { teacher: { select: { full_name: true } } } },
          },
        },
        section: { include: { batch: { include: { program: true } } } },
        semester: true,
        academicYear: true,
      },
    });

    try {
      const assignedTeachers = await prisma.teacherAssigning.findMany({
        where: { courseId: Number(courseId) },
        select: { teacherId: true },
      });
      await syncDiscussionMembershipsForUsers(assignedTeachers.map((x) => x.teacherId));
    } catch (error) {
      console.error("Failed to sync memberships after creating offering", {
        courseId: Number(courseId),
        sectionId: Number(sectionId),
        error: error?.message,
      });
    }

    res.status(201).json({
      message: `"${offering.course.name}" offered to ${section.name} — ${offering.semester.name} / ${offering.academicYear.name}`,
      offering,
    });
  } catch (e) {
    if (e.code === "P2002") {
      return res
        .status(409)
        .json({ message: "This course is already offered to this section for this semester." });
    }
    respondInternalError(res, "Failed to create offering", e);
  }
};

export const deleteCourseOffering = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;
    const deptIds = await getFacultyDepartmentIds(facultyId);

    const offering = await prisma.courseOffering.findFirst({
      where: { id: Number(id), course: { departmentId: { in: deptIds } } },
    });
    if (!offering) return res.status(403).json({ message: "Offering not found in your faculty." });

    await prisma.courseOffering.delete({ where: { id: Number(id) } });

    try {
      const assignedTeachers = await prisma.teacherAssigning.findMany({
        where: { courseId: offering.courseId },
        select: { teacherId: true },
      });
      await syncDiscussionMembershipsForUsers(assignedTeachers.map((x) => x.teacherId));
    } catch (error) {
      console.error("Failed to sync memberships after deleting offering", {
        offeringId: Number(id),
        courseId: offering.courseId,
        error: error?.message,
      });
    }

    res.json({ message: "Course offering removed." });
  } catch (e) {
    respondInternalError(res, "Failed to delete offering", e);
  }
};
