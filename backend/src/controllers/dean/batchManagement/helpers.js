import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";

export const getFacultyProgramIds = async (facultyId) => {
  const departments = await prisma.department.findMany({
    where: { facultyId },
    select: { programs: { select: { id: true } } },
  });
  return departments.flatMap((d) => d.programs.map((p) => p.id));
};

export const assertFacultyBatch = async (batchId, facultyId, res) => {
  const programIds = await getFacultyProgramIds(facultyId);
  const batch = await prisma.batch.findFirst({
    where: { id: Number(batchId), programId: { in: programIds } },
  });
  if (!batch) {
    res.status(403).json(apiErrorBody("Batch does not belong to your faculty.", null));
    return null;
  }
  return batch;
};

export const assertFacultySection = async (sectionId, facultyId, res) => {
  const programIds = await getFacultyProgramIds(facultyId);
  const section = await prisma.batchSection.findFirst({
    where: {
      id: Number(sectionId),
      batch: { programId: { in: programIds } },
    },
    include: { batch: { include: { program: true } } },
  });
  if (!section) {
    res.status(403).json(apiErrorBody("Section does not belong to your faculty.", null));
    return null;
  }
  return section;
};
