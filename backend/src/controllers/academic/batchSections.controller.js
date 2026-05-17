import { prisma } from "../../db/prisma.js";
import { apiErrorBody } from "../../utils/apiEnvelope.js";
import { parsePaginationQuery, paginatedPayload } from "../../utils/pagination.js";
import { getAuthFacultyId } from "../../utils/facultyAccess.js";
import { whereBatchSectionsInFaculty } from "../../utils/scopeWhere.js";
import { archiveDiscussionGroupForScope } from "../../features/discussions/groupProvisioning.service.js";
import { DISCUSSION_SCOPE_TYPES } from "../../features/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../features/discussions/membershipSync.service.js";

// GET all sections (optionally by batch) — paginated; scoped for DEAN / FACULTY_ADMIN / STUDENT
export const getAllBatchSections = async (req, res) => {
  try {
    const { batchId } = req.query;
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
    const role = req.user?.role;

    const batchFilter = batchId ? { batchId: Number(batchId) } : {};
    let where = { ...batchFilter };

    if (role === "DEAN" || role === "FACULTY_ADMIN") {
      const fid = getAuthFacultyId(req.user);
      if (fid == null) {
        return res.json(paginatedPayload({ total: 0, page, pageSize, results: [] }));
      }
      where = { AND: [batchFilter, whereBatchSectionsInFaculty(fid)] };
    } else if (role === "STUDENT" && req.user.facultyId != null) {
      where = {
        AND: [batchFilter, whereBatchSectionsInFaculty(Number(req.user.facultyId))],
      };
    }

    const [sections, total] = await Promise.all([
      prisma.batchSection.findMany({
        where,
        skip,
        take: pageSize,
        include: { batch: true },
        orderBy: { id: "asc" },
      }),
      prisma.batchSection.count({ where }),
    ]);

    res.json(paginatedPayload({ total, page, pageSize, results: sections }));
  } catch (err) {
    res.status(500).json(apiErrorBody("Failed to fetch batch sections", err.message));
  }
};

// GET batch section by ID
export const getBatchSectionById = async (req, res) => {
  const { id } = req.params;
  try {
    const section = await prisma.batchSection.findUnique({
      where: { id: Number(id) },
      include: { batch: true },
    });
    if (!section) return res.status(404).json({ message: "Batch section not found" });
    res.json({ message: "Batch section fetched", section });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch batch section", error: err.message });
  }
};

// CREATE batch section
export const createBatchSection = async (req, res) => {
  const { name, batchId } = req.body;
  // Prevent duplicates in same batch
  const exists = await prisma.batchSection.findUnique({
    where: { batchId_name: { batchId, name } },
  });
  if (exists) {
    return res.status(409).json({ message: "Section with this name already exists in the batch" });
  }

  try {
    const section = await prisma.batchSection.create({
      data: { name, batchId },
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
    res.status(201).json({ message: "Batch section created", section });
  } catch (err) {
    res.status(500).json({ message: "Failed to create batch section", error: err.message });
  }
};

// UPDATE batch section
export const updateBatchSection = async (req, res) => {
  const { id } = req.params;
  const { name, batchId, moderatorUserId } = req.body;
  try {
    const section = await prisma.batchSection.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(batchId !== undefined && { batchId }),
        ...(moderatorUserId !== undefined && {
          moderatorUserId:
            moderatorUserId === null || moderatorUserId === "" ? null : Number(moderatorUserId),
        }),
      },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
        scopeId: section.id,
      });
    } catch (error) {
      console.error("Failed to refresh section discussion group after update", {
        sectionId: section.id,
        error: error?.message,
      });
    }
    res.json({ message: "Batch section updated", section });
  } catch (err) {
    res.status(500).json({ message: "Failed to update batch section", error: err.message });
  }
};

// DELETE batch section
export const deleteBatchSection = async (req, res) => {
  const { id } = req.params;
  try {
    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.SECTION,
      scopeId: Number(id),
    });
    await prisma.batchSection.delete({ where: { id: Number(id) } });
    res.json({ message: "Batch section deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete batch section", error: err.message });
  }
};
