import { prisma } from "../../db/prisma.js";
import { archiveDiscussionGroupForScope } from "../../services/discussions/groupProvisioning.service.js";
import { DISCUSSION_SCOPE_TYPES } from "../../services/discussions/policy.js";
import { respondInternalError } from "../../utils/httpError.js";
import {
  refreshDiscussionMembershipsForScope,
  syncDiscussionMembershipsForUser,
} from "../../services/discussions/membershipSync.service.js";
import { namedListSuccess, apiErrorBody } from "../../utils/apiEnvelope.js";
import { parsePaginationQuery } from "../../utils/pagination.js";

export const getAllFaculties = async (req, res) => {
  try {
    const { search, withoutDean } = req.query;
    const onlyWithoutDean = ["1", "true", "yes"].includes(
      String(withoutDean ?? "").toLowerCase(),
    );
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });
    const where = {
      ...(onlyWithoutDean ? { deanProfile: { is: null } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: String(search), mode: "insensitive" } },
              { code: { contains: String(search), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [totalCount, faculties] = await Promise.all([
      prisma.faculty.count({ where }),
      prisma.faculty.findMany({
        where,
        include: {
          departments: true,
          dean: { select: { id: true, full_name: true, email: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
    ]);

    res.json(
      namedListSuccess({
        message: "Faculties retrieved successfully",
        name: "faculties",
        items: faculties,
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (err) {
    res.status(500).json(apiErrorBody("Failed to fetch faculties", err.message));
  }
};

export const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await prisma.faculty.findUnique({
      where: { id: Number(id) },
      include: {
        departments: true,
        dean: { select: { id: true, full_name: true, email: true } }
      }
    });
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });
    res.json({ message: "Faculty retrieved successfully", faculty });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch faculty", detail: err.message });
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { name, code, defaultDurationYears } = req.body;
    if (!name || !code) return res.status(400).json({ message: "Name and code are required" });
    const existing = await prisma.faculty.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ message: "Faculty code already in use" });

    const duration = Number(defaultDurationYears);
    const faculty = await prisma.faculty.create({
      data: {
        name,
        code,
        ...(Number.isFinite(duration) && duration > 0
          ? { defaultDurationYears: duration }
          : {}),
      },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.FACULTY,
        scopeId: faculty.id,
      });
    } catch (error) {
      console.error("Failed to auto-create faculty discussion group", {
        facultyId: faculty.id,
        error: error?.message,
      });
    }
    res.status(201).json({ message: "Faculty created successfully", faculty });
  } catch (err) {
    res.status(500).json({ message: "Failed to create faculty", detail: err.message });
  }
};

export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, defaultDurationYears } = req.body;
    const duration = Number(defaultDurationYears);
    const faculty = await prisma.faculty.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(Number.isFinite(duration) && duration > 0
          ? { defaultDurationYears: duration }
          : {}),
      },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.FACULTY,
        scopeId: faculty.id,
      });
    } catch (error) {
      console.error("Failed to refresh faculty discussion group after update", {
        facultyId: faculty.id,
        error: error?.message,
      });
    }
    res.json({ message: "Faculty updated successfully", faculty });
  } catch (err) {
    res.status(500).json({ message: "Failed to update faculty", detail: err.message });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.FACULTY,
      scopeId: Number(id),
    });
    await prisma.faculty.delete({ where: { id: Number(id) } });
    res.json({ message: "Faculty deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete faculty", detail: err.message });
  }
};

// PATCH /api/faculties/:facultyId/assign-dean
export const assignDean = async (req, res) => {
  try {
    const facultyId = Number(req.params.facultyId);
    const { deanId } = req.body;

    // Check user exists and is a DEAN
    const dean = await prisma.user.findUnique({
      where: { id: deanId },
      include: { role: true }
    });
    if (!dean) return res.status(404).json({ message: "Dean user not found." });
    if (dean.role.name !== "DEAN")
      return res.status(400).json({ message: "User is not a DEAN." });

    // Ensure faculty exists
    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) return res.status(404).json({ message: "Faculty not found." });

    const currentFaculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      select: { deanId: true },
    });

    // Assign
    const updatedFaculty = await prisma.faculty.update({
      where: { id: facultyId },
      data: { deanId: dean.id }
    });

    try {
      await syncDiscussionMembershipsForUser(dean.id);
      if (currentFaculty?.deanId && currentFaculty.deanId !== dean.id) {
        await syncDiscussionMembershipsForUser(currentFaculty.deanId);
      }
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.FACULTY,
        scopeId: facultyId,
      });
    } catch (error) {
      console.error("Failed to sync discussion memberships after dean assignment", {
        facultyId,
        deanId: dean.id,
        error: error?.message,
      });
    }

    res.json({ message: "Dean assigned to faculty", faculty: updatedFaculty });
  } catch (err) {
    respondInternalError(res, "Dean assignment failed", err);
  }
};