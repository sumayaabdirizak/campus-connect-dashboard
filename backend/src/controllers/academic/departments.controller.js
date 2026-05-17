import { prisma } from "../../db/prisma.js";
import { archiveDiscussionGroupForScope } from "../../features/discussions/groupProvisioning.service.js";
import { DISCUSSION_SCOPE_TYPES } from "../../features/discussions/policy.js";
import { refreshDiscussionMembershipsForScope } from "../../features/discussions/membershipSync.service.js";

/**
 * Deans and faculty admins only see/act on departments in their assigned faculty.
 * SUPER_ADMIN and other roles use unrestricted list access (legacy behavior for non–faculty-scoped roles).
 */
async function facultyScopeForRestrictedAcademicRoles(req) {
  const role = String(req.user?.role || "");
  if (role === "SUPER_ADMIN") return { mode: "all" };
  if (role !== "DEAN" && role !== "FACULTY_ADMIN") return { mode: "all" };

  let fid = req.user?.facultyId ?? req.user?.faculty_id;
  const uid = Number(req.user?.sub ?? req.user?.id ?? 0);
  if ((fid == null || fid === "") && uid > 0) {
    if (role === "DEAN") {
      const d = await prisma.deanProfile.findUnique({
        where: { userId: uid },
        select: { facultyId: true },
      });
      fid = d?.facultyId ?? null;
    } else {
      const fa = await prisma.facultyAdminProfile.findUnique({
        where: { user_id: uid },
        select: { faculty_id: true },
      });
      fid = fa?.faculty_id ?? null;
    }
  }
  const n = fid == null || fid === "" ? null : Number(fid);
  if (n == null || !Number.isFinite(n) || n <= 0) {
    return { mode: "none" };
  }
  return { mode: "faculty", facultyId: n };
}

// GET all departments (include faculty and programs)
export const getAllDepartments = async (req, res) => {
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const where =
      scope.mode === "faculty"
        ? { facultyId: scope.facultyId }
        : scope.mode === "none"
          ? { facultyId: -1 }
          : {};

    const departments = await prisma.department.findMany({
      where,
      include: {
        faculty: true,
        programs: true,
      },
    });
    res.json({ message: "Departments fetched", departments });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch departments", error: err.message });
  }
};

// GET department by ID
export const getDepartmentById = async (req, res) => {
  const { id } = req.params;
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const department = await prisma.department.findUnique({
      where: { id: Number(id) },
      include: {
        faculty: true,
        programs: true,
      },
    });
    if (!department) return res.status(404).json({ message: "Department not found" });
    if (scope.mode === "faculty" && Number(department.facultyId) !== Number(scope.facultyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (scope.mode === "none") {
      return res.status(403).json({ message: "No faculty scope for this account" });
    }
    res.json({ message: "Department fetched", department });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch department", error: err.message });
  }
};

// CREATE department
export const createDepartment = async (req, res) => {
  const { name, code, facultyId } = req.body;
  if (!name || !code || !facultyId) {
    return res.status(400).json({ message: "name, code, and facultyId are required" });
  }
  try {
    const department = await prisma.department.create({
      data: { name, code, facultyId: Number(facultyId) },
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
    res.status(500).json({ message: "Failed to create department", error: err.message });
  }
};

// UPDATE department
export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, code, facultyId, headUserId } = req.body;
  try {
    const department = await prisma.department.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(facultyId && { facultyId: Number(facultyId) }),
        ...(headUserId !== undefined && {
          headUserId: headUserId === null || headUserId === "" ? null : Number(headUserId),
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
    res.status(500).json({ message: "Failed to update department", error: err.message });
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
    res.status(500).json({ message: "Failed to delete department", error: err.message });
  }
};