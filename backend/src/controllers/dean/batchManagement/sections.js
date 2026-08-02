import { prisma } from "../../../db/prisma.js";
import { archiveDiscussionGroupForScope } from "../../../services/discussions/groupProvisioning.service.js";
import { DISCUSSION_SCOPE_TYPES } from "../../../services/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../../services/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";
import { assertFacultyBatch, assertFacultySection } from "./helpers.js";

export const getBatchSections = async (req, res) => {
  try {
    const { id: batchId } = req.params;
    const { facultyId } = req;

    const batch = await assertFacultyBatch(batchId, facultyId, res);
    if (!batch) return;

    const sections = await prisma.batchSection.findMany({
      where: { batchId: Number(batchId) },
      include: {
        _count: { select: { studentRegistrations: true, courseOfferings: true } },
        courseOfferings: {
          include: {
            course: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ batchId: Number(batchId), sections });
  } catch (e) {
    respondInternalError(res, "Failed to fetch sections", e);
  }
};

export const getSectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const section = await assertFacultySection(id, facultyId, res);
    if (!section) return;

    const full = await prisma.batchSection.findUnique({
      where: { id: Number(id) },
      include: {
        batch: { include: { program: true, academicYear: true } },
        studentRegistrations: {
          include: {
            student: { select: { id: true, full_name: true, number: true, email: true, status: true } },
            currentSemester: true,
          },
        },
        courseOfferings: {
          include: {
            course: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    res.json({ section: full });
  } catch (e) {
    respondInternalError(res, "Failed to fetch section", e);
  }
};

export const createBatchSection = async (req, res) => {
  try {
    const { id: batchId } = req.params;
    const { name } = req.body;
    const { facultyId } = req;

    if (!name) return res.status(400).json({ message: "Section name is required." });

    const batch = await assertFacultyBatch(batchId, facultyId, res);
    if (!batch) return;

    const section = await prisma.batchSection.create({
      data: { name, batchId: Number(batchId) },
      include: { batch: { include: { program: true } } },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
        scopeId: section.id,
      });
    } catch (error) {
      console.error("Failed to auto-create section discussion group", {
        sectionId: section.id,
        error: error?.message,
      });
    }

    res.status(201).json({ message: `Section "${name}" created for batch "${batch.name}"`, section });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ message: "A section with this name already exists in this batch." });
    }
    respondInternalError(res, "Failed to create section", e);
  }
};

export const updateBatchSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, moderatorUserId } = req.body;
    const { facultyId } = req;

    const existing = await assertFacultySection(id, facultyId, res);
    if (!existing) return;

    if (!name) return res.status(400).json({ message: "Section name is required." });

    const updated = await prisma.batchSection.update({
      where: { id: Number(id) },
      data: {
        name,
        ...(moderatorUserId !== undefined && {
          moderatorUserId:
            moderatorUserId === null || moderatorUserId === "" ? null : Number(moderatorUserId),
        }),
      },
      include: { batch: { include: { program: true } } },
    });

    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
        scopeId: updated.id,
      });
    } catch (error) {
      console.error("Failed to refresh section discussion group after update", {
        sectionId: updated.id,
        error: error?.message,
      });
    }

    res.json({ message: "Section updated", section: updated });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ message: "A section with this name already exists in this batch." });
    }
    respondInternalError(res, "Failed to update section", e);
  }
};

export const deleteBatchSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertFacultySection(id, facultyId, res);
    if (!existing) return;

    const studentCount = await prisma.studentRegistration.count({
      where: { batchSectionId: Number(id) },
    });

    if (studentCount > 0) {
      return res.status(409).json({
        message: `Cannot delete section — ${studentCount} student(s) are registered in it. Remove them first.`,
      });
    }

    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
      scopeId: Number(id),
    });

    await prisma.$transaction([
      prisma.courseOffering.deleteMany({ where: { sectionId: Number(id) } }),
      prisma.batchSection.delete({ where: { id: Number(id) } }),
    ]);

    res.json({ message: "Section deleted successfully." });
  } catch (e) {
    respondInternalError(res, "Failed to delete section", e);
  }
};
