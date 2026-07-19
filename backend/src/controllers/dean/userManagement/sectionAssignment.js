import { prisma } from "../../../db/prisma.js";
import { syncDiscussionMembershipsForUser } from "../../../features/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";

export const assignStudentToSection = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { batchSectionId, academicYearId, semesterId } = req.body;
    const { facultyId } = req;

    if (!batchSectionId || !academicYearId || !semesterId) {
      return res
        .status(400)
        .json({ message: "batchSectionId, academicYearId, and semesterId are required." });
    }

    const student = await prisma.user.findFirst({
      where: { id: Number(studentId), studentProfile: { facultyId } },
    });
    if (!student) {
      return res.status(403).json({ message: "Student not found in your faculty." });
    }

    const section = await prisma.batchSection.findFirst({
      where: {
        id: Number(batchSectionId),
        batch: {
          program: {
            department: { facultyId },
          },
        },
      },
      include: { batch: { include: { program: true } } },
    });
    if (!section) {
      return res.status(403).json({ message: "Batch section does not belong to your faculty." });
    }

    const existing = await prisma.studentRegistration.findFirst({
      where: { studentId: Number(studentId), batchSectionId: Number(batchSectionId) },
    });
    if (existing) {
      return res.status(409).json({ message: "Student already assigned to this section." });
    }

    await prisma.studentRegistration.deleteMany({
      where: {
        studentId: Number(studentId),
        batchSectionId: { not: Number(batchSectionId) },
      },
    });

    const registration = await prisma.studentRegistration.create({
      data: {
        studentId: Number(studentId),
        batchSectionId: Number(batchSectionId),
        registrationAcademicYearId: Number(academicYearId),
        currentAcademicYearId: Number(academicYearId),
        currentSemesterId: Number(semesterId),
      },
      include: {
        batchSection: { include: { batch: { include: { program: true } } } },
        currentAcademicYear: true,
        currentSemester: true,
      },
    });

    try {
      await syncDiscussionMembershipsForUser(Number(studentId));
    } catch (error) {
      console.error("Failed to sync memberships after section assignment", {
        studentId: Number(studentId),
        error: error?.message,
      });
    }

    res.status(201).json({
      message: `Student assigned to "${section.name}" in batch "${section.batch.name}"`,
      registration,
    });
  } catch (e) {
    respondInternalError(res, "Failed to assign student", e);
  }
};

export const getStudentRegistrations = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { facultyId } = req;

    const student = await prisma.user.findFirst({
      where: { id: Number(studentId), studentProfile: { facultyId } },
    });
    if (!student) {
      return res.status(403).json({ message: "Student not in your faculty." });
    }

    const registrations = await prisma.studentRegistration.findMany({
      where: { studentId: Number(studentId) },
      include: {
        batchSection: {
          include: { batch: { include: { program: true, academicYear: true } } },
        },
        currentAcademicYear: true,
        currentSemester: true,
      },
    });

    res.json({ studentId: Number(studentId), registrations });
  } catch (e) {
    respondInternalError(res, "Failed to fetch registrations", e);
  }
};
