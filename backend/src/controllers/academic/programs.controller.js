import { prisma } from "../../db/prisma.js";
import { respondInternalError } from "../../utils/httpError.js";
import { namedListSuccess } from "../../utils/apiEnvelope.js";
import { parsePaginationQuery } from "../../utils/pagination.js";
import {
  facultyScopeForRestrictedAcademicRoles,
  programWhereForFacultyScope,
} from "./facultyScope.js";
import { assertDepartmentInScope, assertProgramInScope } from "./programScope.js";

// GET all programs — deans: own faculty only
export const getAllPrograms = async (req, res) => {
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const { departmentId, level, search } = req.query;
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const where = { ...programWhereForFacultyScope(scope) };
    if (departmentId) where.departmentId = Number(departmentId);
    if (level) where.level = level;
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { code: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [totalCount, programs] = await Promise.all([
      prisma.program.count({ where }),
      prisma.program.findMany({
        where,
        include: {
          department: {
            include: {
              faculty: { select: { id: true, name: true, code: true } },
            },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
    ]);

    res.json(
      namedListSuccess({
        message: "Programs fetched",
        name: "programs",
        items: programs,
        page,
        pageSize,
        totalCount,
      })
    );
  } catch (err) {
    respondInternalError(res, "Failed to fetch programs", err);
  }
};

export const getProgramById = async (req, res) => {
  const { id } = req.params;
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const gate = await assertProgramInScope(id, scope);
    if (!gate.ok) return res.status(gate.status).json({ message: gate.message });

    const program = await prisma.program.findUnique({
      where: { id: Number(id) },
      include: { department: true },
    });
    if (!program) return res.status(404).json({ message: "Program not found" });
    res.json({ message: "Program fetched", program });
  } catch (err) {
    respondInternalError(res, "Failed to fetch program", err);
  }
};

export const createProgram = async (req, res) => {
  const { name, code, level, departmentId, durationYears } = req.body;
  if (!name || !code || !level || !departmentId) {
    return res.status(400).json({ message: "name, code, level, and departmentId are required" });
  }
  if (!["UNDERGRADUATE", "POSTGRADUATE"].includes(level)) {
    return res.status(400).json({ message: "Invalid level" });
  }
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const deptGate = await assertDepartmentInScope(departmentId, scope);
    if (!deptGate.ok) return res.status(deptGate.status).json({ message: deptGate.message });

    const department =
      deptGate.department ??
      (await prisma.department.findUnique({
        where: { id: Number(departmentId) },
        include: { faculty: { select: { defaultDurationYears: true } } },
      }));
    if (!department) {
      return res.status(400).json({ message: "Department not found" });
    }

    const requested = Number(durationYears);
    const resolvedDuration =
      Number.isFinite(requested) && requested > 0
        ? requested
        : department.faculty?.defaultDurationYears ?? 4;

    const program = await prisma.program.create({
      data: {
        name,
        code,
        level,
        departmentId: Number(departmentId),
        durationYears: resolvedDuration,
      },
      include: {
        department: {
          include: {
            faculty: {
              select: { id: true, name: true, code: true, defaultDurationYears: true },
            },
          },
        },
      },
    });
    res.status(201).json({ message: "Program created", program });
  } catch (err) {
    respondInternalError(res, "Failed to create program", err);
  }
};

export const updateProgram = async (req, res) => {
  const { id } = req.params;
  const { name, code, level, departmentId, durationYears } = req.body;
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const gate = await assertProgramInScope(id, scope);
    if (!gate.ok) return res.status(gate.status).json({ message: gate.message });

    if (departmentId) {
      const deptGate = await assertDepartmentInScope(departmentId, scope);
      if (!deptGate.ok) return res.status(deptGate.status).json({ message: deptGate.message });
    }
    if (level && !["UNDERGRADUATE", "POSTGRADUATE"].includes(level)) {
      return res.status(400).json({ message: "Invalid level" });
    }

    const duration = Number(durationYears);
    const program = await prisma.program.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(level !== undefined && { level }),
        ...(departmentId !== undefined && { departmentId: Number(departmentId) }),
        ...(Number.isFinite(duration) && duration > 0 ? { durationYears: duration } : {}),
      },
      include: {
        department: {
          include: {
            faculty: {
              select: { id: true, name: true, code: true, defaultDurationYears: true },
            },
          },
        },
      },
    });
    res.json({ message: "Program updated", program });
  } catch (err) {
    respondInternalError(res, "Failed to update program", err);
  }
};

export const deleteProgram = async (req, res) => {
  const { id } = req.params;
  try {
    const scope = await facultyScopeForRestrictedAcademicRoles(req);
    const gate = await assertProgramInScope(id, scope);
    if (!gate.ok) return res.status(gate.status).json({ message: gate.message });

    await prisma.program.delete({ where: { id: Number(id) } });
    res.json({ message: "Program deleted" });
  } catch (err) {
    respondInternalError(res, "Failed to delete program", err);
  }
};
