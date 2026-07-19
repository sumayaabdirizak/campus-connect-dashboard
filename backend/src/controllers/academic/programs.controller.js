import { prisma } from "../../db/prisma.js";
import { respondInternalError } from "../../utils/httpError.js";
import { namedListSuccess } from "../../utils/apiEnvelope.js";
import { parsePaginationQuery } from "../../utils/pagination.js";

// GET all programs (optionally filter by department/level)
export const getAllPrograms = async (req, res) => {
  try {
    const { departmentId, level, search } = req.query;
    const { page, pageSize, skip } = parsePaginationQuery(req.query, {
      defaultPageSize: 50,
      maxPageSize: 200,
    });

    const where = {};
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
        include: { department: true },
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

// GET program by ID
export const getProgramById = async (req, res) => {
  const { id } = req.params;
  try {
    const program = await prisma.program.findUnique({
      where: { id: Number(id) },
      include: { department: true }
    });
    if (!program) return res.status(404).json({ message: "Program not found" });
    res.json({ message: "Program fetched", program });
  } catch (err) {
    respondInternalError(res, "Failed to fetch program", err);
  }
};

// CREATE program, checking department supports the given level
export const createProgram = async (req, res) => {
  const { name, code, level, departmentId } = req.body;
  if (!["UNDERGRADUATE", "POSTGRADUATE"].includes(level)) {
    return res.status(400).json({ message: "Invalid level" });
  }
  // Check if the department supports this level
  const support = await prisma.departmentProgramLevel.findUnique({
    where: {
      departmentId_level: {
        departmentId: departmentId,
        level: level,
      }
    }
  });
  if (!support) {
    return res.status(400).json({ message: "Department does not support this level" });
  }
  try {
    const program = await prisma.program.create({
      data: { name, code, level, departmentId }
    });
    res.status(201).json({ message: "Program created", program });
  } catch (err) {
    respondInternalError(res, "Failed to create program", err);
  }
};

// UPDATE program (optional: prevent changing departmentId/level to unsupported combo)
export const updateProgram = async (req, res) => {
  const { id } = req.params;
  const { name, code, level, departmentId } = req.body;
  try {
    // If updating departmentId or level, check department supports it
    if (departmentId && level) {
      const support = await prisma.departmentProgramLevel.findUnique({
        where: {
          departmentId_level: {
            departmentId: departmentId,
            level: level,
          }
        }
      });
      if (!support) {
        return res.status(400).json({ message: "Department does not support this level" });
      }
    }
    const program = await prisma.program.update({
      where: { id: Number(id) },
      data: { name, code, level, departmentId }
    });
    res.json({ message: "Program updated", program });
  } catch (err) {
    respondInternalError(res, "Failed to update program", err);
  }
};

// DELETE program
export const deleteProgram = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.program.delete({
      where: { id: Number(id) }
    });
    res.json({ message: "Program deleted" });
  } catch (err) {
    respondInternalError(res, "Failed to delete program", err);
  }
};