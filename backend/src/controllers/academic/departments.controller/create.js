import { prisma } from "../../../db/prisma.js";
import { archiveDiscussionGroupForScope } from "../../../features/discussions/groupProvisioning.service.js";
import { DISCUSSION_SCOPE_TYPES } from "../../../features/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../../features/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";

// CREATE department
// Body is pre-validated by validateBody(createDepartmentBodySchema) — see
// ../../departments.js and ../../../validation/departmentsSchemas.js.
export const createDepartment = async (req, res) => {
  const { name, code, facultyId } = req.body;
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
    });
    if (!faculty) {
      return res.status(400).json({ message: "Faculty not found" });
    }

    const department = await prisma.department.create({
      data: { name, code, facultyId },
      include: { faculty: true, programs: true },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.DEPARTMENT,
        scopeId: department.id,
      });
    } catch (error) {
      console.error("Failed to auto-create department discussion group", {
        departmentId: department.id,
        error: error?.message,
      });
    }
    res.status(201).json({ message: "Department created", department });
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({
        message: `Department code "${String(code).toUpperCase()}" is already in use.`,
      });
    }
    respondInternalError(res, "Failed to create department", err);
  }
};

// DELETE department
export const deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    await archiveDiscussionGroupForScope({
      scopeType: DISCUSSION_SCOPE_TYPES.DEPARTMENT,
      scopeId: Number(id),
    });
    await prisma.department.delete({ where: { id: Number(id) } });
    res.json({ message: "Department deleted" });
  } catch (err) {
    respondInternalError(res, "Failed to delete department", err);
  }
};
