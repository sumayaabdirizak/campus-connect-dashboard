import { prisma } from "../../db/prisma.js";

// ─── HELPER ──────────────────────────────────────────────────────────────────
// Get all program IDs that belong to the dean's faculty
const getFacultyProgramIds = async (facultyId) => {
  const departments = await prisma.department.findMany({
    where: { facultyId },
    select: { programs: { select: { id: true } } }
  });
  return departments.flatMap(d => d.programs.map(p => p.id));
};

// Assert a batch belongs to the dean's faculty, return it or send 403
const assertFacultyBatch = async (batchId, facultyId, res) => {
  const programIds = await getFacultyProgramIds(facultyId);
  const batch = await prisma.batch.findFirst({
    where: { id: Number(batchId), programId: { in: programIds } }
  });
  if (!batch) {
    res.status(403).json({ message: 'Batch does not belong to your faculty.' });
    return null;
  }
  return batch;
};

// Assert a section belongs to a batch in the dean's faculty
const assertFacultySection = async (sectionId, facultyId, res) => {
  const programIds = await getFacultyProgramIds(facultyId);
  const section = await prisma.batchSection.findFirst({
    where: {
      id: Number(sectionId),
      batch: { programId: { in: programIds } }
    },
    include: { batch: { include: { program: true } } }
  });
  if (!section) {
    res.status(403).json({ message: 'Section does not belong to your faculty.' });
    return null;
  }
  return section;
};

// ─── 1. LIST BATCHES ────────────────────────────────────────────────────────
/**
 * GET /api/dean/batches
 * Query: programId, academicYearId, search
 */
export const getFacultyBatches = async (req, res) => {
  try {
    const { facultyId } = req;
    const { programId, academicYearId, search } = req.query;
    const programIds = await getFacultyProgramIds(facultyId);

    const batches = await prisma.batch.findMany({
      where: {
        programId: programId ? Number(programId) : { in: programIds },
        ...(academicYearId ? { academicYearId: Number(academicYearId) } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
      },
      include: {
        program: { include: { department: { select: { id: true, name: true } } } },
        academicYear: true,
        sections: {
          include: {
            _count: { select: { studentRegistrations: true, offerings: true } }
          }
        },
        _count: { select: { sections: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      message: 'Batches fetched',
      count: batches.length,
      batches
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch batches', error: e.message });
  }
};

// ─── 2. GET SINGLE BATCH ────────────────────────────────────────────────────
/**
 * GET /api/dean/batches/:id
 */
export const getFacultyBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const batch = await assertFacultyBatch(id, facultyId, res);
    if (!batch) return;

    const full = await prisma.batch.findUnique({
      where: { id: Number(id) },
      include: {
        program: { include: { department: { include: { faculty: true } } } },
        academicYear: true,
        sections: {
          include: {
            studentRegistrations: {
              include: {
                student: { select: { id: true, full_name: true, number: true, email: true } }
              }
            },
            offerings: {
              include: {
                course: { select: { name: true, code: true } }
              }
            }
          }
        }
      }
    });

    res.json({ batch: full });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch batch', error: e.message });
  }
};

// ─── 3. CREATE BATCH ────────────────────────────────────────────────────────
/**
 * POST /api/dean/batches
 * Body: { name, programId, academicYearId, semester_number }
 */
export const createFacultyBatch = async (req, res) => {
  try {
    const { facultyId } = req;
    const { name, programId, academicYearId, semester_number } = req.body;

    if (!name || !programId || !academicYearId) {
      return res.status(400).json({ message: 'name, programId, and academicYearId are required.' });
    }

    // Verify program belongs to this faculty
    const programIds = await getFacultyProgramIds(facultyId);
    if (!programIds.includes(Number(programId))) {
      return res.status(403).json({ message: 'Program does not belong to your faculty.' });
    }

    const batch = await prisma.batch.create({
      data: {
        name,
        programId: Number(programId),
        academicYearId: Number(academicYearId),
        semester_number: Number(semester_number) || 1,
        academic_year: new Date().getFullYear(),
        created_by_id: req.user.sub
      },
      include: {
        program: true,
        academicYear: true,
        sections: true
      }
    });

    res.status(201).json({ message: 'Batch created successfully', batch });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create batch', error: e.message });
  }
};

// ─── 4. UPDATE BATCH ─────────────────────────────────────────────────────────
/**
 * PUT /api/dean/batches/:id
 * Body: { name, semester_number, academicYearId }
 */
export const updateFacultyBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertFacultyBatch(id, facultyId, res);
    if (!existing) return;

    const { name, semester_number, academicYearId } = req.body;

    const updated = await prisma.batch.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(semester_number && { semester_number: Number(semester_number) }),
        ...(academicYearId && { academicYearId: Number(academicYearId) }),
        modified_by_id: req.user.sub
      },
      include: { program: true, academicYear: true, sections: true }
    });

    res.json({ message: 'Batch updated', batch: updated });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update batch', error: e.message });
  }
};

// ─── 5. DELETE BATCH ─────────────────────────────────────────────────────────
/**
 * DELETE /api/dean/batches/:id
 */
export const deleteFacultyBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertFacultyBatch(id, facultyId, res);
    if (!existing) return;

    // Check if batch has any student registrations
    const registrationCount = await prisma.studentRegistration.count({
      where: { batchSection: { batchId: Number(id) } }
    });

    if (registrationCount > 0) {
      return res.status(409).json({
        message: `Cannot delete batch — it has ${registrationCount} student registration(s). Remove them first.`
      });
    }

    // Delete offerings first, then sections, then batch
    await prisma.$transaction([
      prisma.courseOffering.deleteMany({ where: { section: { batchId: Number(id) } } }),
      prisma.batchSection.deleteMany({ where: { batchId: Number(id) } }),
      prisma.batch.delete({ where: { id: Number(id) } })
    ]);

    res.json({ message: 'Batch and its sections deleted successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete batch', error: e.message });
  }
};

// ─── 6. LIST SECTIONS FOR A BATCH ────────────────────────────────────────────
/**
 * GET /api/dean/batches/:id/sections
 */
export const getBatchSections = async (req, res) => {
  try {
    const { id: batchId } = req.params;
    const { facultyId } = req;

    const batch = await assertFacultyBatch(batchId, facultyId, res);
    if (!batch) return;

    const sections = await prisma.batchSection.findMany({
      where: { batchId: Number(batchId) },
      include: {
        _count: { select: { studentRegistrations: true, offerings: true } },
        offerings: {
          include: {
            course: { select: { id: true, name: true, code: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ batchId: Number(batchId), sections });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch sections', error: e.message });
  }
};

// ─── 7. GET SINGLE SECTION ───────────────────────────────────────────────────
/**
 * GET /api/dean/sections/:id
 */
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
            currentSemester: true
          }
        },
        offerings: {
          include: {
            course: { select: { id: true, name: true, code: true } }
          }
        }
      }
    });

    res.json({ section: full });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch section', error: e.message });
  }
};

// ─── 8. CREATE SECTION ───────────────────────────────────────────────────────
/**
 * POST /api/dean/batches/:id/sections
 * Body: { name }
 */
export const createBatchSection = async (req, res) => {
  try {
    const { id: batchId } = req.params;
    const { name } = req.body;
    const { facultyId } = req;

    if (!name) return res.status(400).json({ message: 'Section name is required.' });

    const batch = await assertFacultyBatch(batchId, facultyId, res);
    if (!batch) return;

    const section = await prisma.batchSection.create({
      data: { name, batchId: Number(batchId) },
      include: { batch: { include: { program: true } } }
    });

    res.status(201).json({ message: `Section "${name}" created for batch "${batch.name}"`, section });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ message: 'A section with this name already exists in this batch.' });
    }
    res.status(500).json({ message: 'Failed to create section', error: e.message });
  }
};

// ─── 9. UPDATE SECTION ───────────────────────────────────────────────────────
/**
 * PUT /api/dean/sections/:id
 * Body: { name }
 */
export const updateBatchSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { facultyId } = req;

    const existing = await assertFacultySection(id, facultyId, res);
    if (!existing) return;

    if (!name) return res.status(400).json({ message: 'Section name is required.' });

    const updated = await prisma.batchSection.update({
      where: { id: Number(id) },
      data: { name },
      include: { batch: { include: { program: true } } }
    });

    res.json({ message: 'Section updated', section: updated });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ message: 'A section with this name already exists in this batch.' });
    }
    res.status(500).json({ message: 'Failed to update section', error: e.message });
  }
};

// ─── 10. DELETE SECTION ──────────────────────────────────────────────────────
/**
 * DELETE /api/dean/sections/:id
 */
export const deleteBatchSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { facultyId } = req;

    const existing = await assertFacultySection(id, facultyId, res);
    if (!existing) return;

    // Check for active student registrations
    const studentCount = await prisma.studentRegistration.count({
      where: { batchSectionId: Number(id) }
    });

    if (studentCount > 0) {
      return res.status(409).json({
        message: `Cannot delete section — ${studentCount} student(s) are registered in it. Remove them first.`
      });
    }

    await prisma.$transaction([
      prisma.courseOffering.deleteMany({ where: { sectionId: Number(id) } }),
      prisma.batchSection.delete({ where: { id: Number(id) } })
    ]);

    res.json({ message: 'Section deleted successfully.' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete section', error: e.message });
  }
};
