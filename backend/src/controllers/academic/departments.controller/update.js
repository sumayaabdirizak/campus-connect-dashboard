import { prisma } from "../../../db/prisma.js";
import { DISCUSSION_SCOPE_TYPES } from "../../../features/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../../features/discussions/membershipSync.service.js";
import { respondInternalError } from "../../../utils/httpError.js";

// UPDATE department
// Body is pre-validated by validateBody(updateDepartmentBodySchema) — see
// ../../departments.js and ../../../validation/departmentsSchemas.js.
export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, code, facultyId, headUserId } = req.body;
  try {
    const department = await prisma.department.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(facultyId !== undefined && { facultyId }),
        ...(headUserId !== undefined && {
          headUserId: headUserId === null || headUserId === "" ? null : headUserId,
        }),
      },
      include: { faculty: true, programs: true },
    });
    try {
      await refreshDiscussionMembershipsForScope({
        scopeType: DISCUSSION_SCOPE_TYPES.DEPARTMENT,
        scopeId: department.id,
      });
    } catch (error) {
      console.error("Failed to refresh department discussion group after update", {
        departmentId: department.id,
        error: error?.message,
      });
    }
    res.json({ message: "Department updated", department });
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({
        message: `Department code "${String(code ?? "").toUpperCase()}" is already in use.`,
      });
    }
    respondInternalError(res, "Failed to update department", err);
  }
};
