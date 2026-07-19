import { prisma } from "../../../db/prisma.js";
import { archiveDiscussionGroupForScope } from "../../../features/discussions/groupProvisioning.service.js";
import { DISCUSSION_SCOPE_TYPES } from "../../../features/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../../features/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertFacultyBatch, getFacultyProgramIds } from "./helpers.js";

export const createFacultyBatch = async (req, res) => {
  try {
    const { facultyId } = req;
    const { name, programId, academicYearId, semester_number } = req.body;

    if (!name || !programId || !academicYearId) {
      return res.status(400).json({ message: "name, programId, and academicYearId are required." });
    }

    const programIds = await getFacultyProgramIds(facultyId);
    if (!programIds.includes(Number(programId))) {
      return res.status(403).json({ message: "Program does not belong to your faculty." });
    }

    const batch = await prisma.batch.create({
      data: {
        name,
        programId: Number(programId),
        academicYearId: Number(academicYearId),
        semester_number: Number(semester_number) || 1,
        academic_year: new Date().getFullYear(),
        created_by_id: req.user.sub,
      },
      include: {
        program: true,
        academicYear: true,
        sections: true,
      },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
        scopeId: batch.id,
      });
    } catch (error) {
      console.error("Failed to auto-create batch discussion group", {
        batchId: batch.id,
        error: error?.message,
      });
    }

    res.status(201).json({ message: "Batch created successfully", batch });
  } catch (e) {
    respondInternalError(res, "Failed to create batch", e);
  }
};

export const updateFacultyBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertFacultyBatch(id, facultyId, res);
    if (!existing) return;

    const { name, semester_number, academicYearId, advisorUserId } = req.body;

    const updated = await prisma.batch.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(semester_number && { semester_number: Number(semester_number) }),
        ...(academicYearId && { academicYearId: Number(academicYearId) }),
        ...(advisorUserId !== undefined && {
          advisorUserId: advisorUserId === null || advisorUserId === "" ? null : Number(advisorUserId),
        }),
        modified_by_id: req.user.sub,
      },
      include: { program: true, academicYear: true, sections: true },
    });

    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
        scopeId: updated.id,
      });
    } catch (error) {
      console.error("Failed to refresh batch discussion group after update", {
        batchId: updated.id,
        error: error?.message,
      });
    }

    res.json({ message: "Batch updated", batch: updated });
  } catch (e) {
    respondInternalError(res, "Failed to update batch", e);
  }
};

export const deleteFacultyBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertFacultyBatch(id, facultyId, res);
    if (!existing) return;

    const registrationCount = await prisma.studentRegistration.count({
      where: { batchSection: { batchId: Number(id) } },
    });

    if (registrationCount > 0) {
      return res.status(409).json({
        message: `Cannot delete batch — it has ${registrationCount} student registration(s). Remove them first.`,
      });
    }

    const sectionsInBatch = await prisma.batchSection.findMany({
      where: { batchId: Number(id) },
      select: { id: true },
    });
    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.BATCH,
      scopeId: Number(id),
    });
    for (const section of sectionsInBatch) {
      await archiveDiscussionGroupForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
        scopeId: section.id,
      });
    }

    await prisma.$transaction([
      prisma.courseOffering.deleteMany({ where: { section: { batchId: Number(id) } } }),
      prisma.batchSection.deleteMany({ where: { batchId: Number(id) } }),
      prisma.batch.delete({ where: { id: Number(id) } }),
    ]);

    res.json({ message: "Batch and its sections deleted successfully." });
  } catch (e) {
    respondInternalError(res, "Failed to delete batch", e);
  }
};
