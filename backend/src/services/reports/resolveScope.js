import { prisma } from '../../db/prisma.js';

/**
 * Every report scope narrows to the same two things: a set of course
 * offerings, and (where relevant) a set of people. Resolving that once here
 * means each domain aggregator is written against offering ids and never has
 * to care whether it was asked for a course, a batch or a whole faculty.
 *
 * @returns {Promise<{
 *   subject: { id: string|number, name: string, subtitle: string|null, meta: Array<{label:string,value:string}> },
 *   offeringIds: number[],
 *   studentIds: number[] | null,   // null = "not person-scoped"
 *   facultyIds: number[] | null,
 *   batchIds: number[] | null,
 *   sectionIds: number[] | null
 * } | null>} null when the subject does not exist.
 */
export async function resolveScope(scope, rawId) {
  switch (scope) {
    case 'course':
      return resolveCourse(rawId);
    case 'teacher':
      return resolveTeacher(rawId);
    case 'student':
      return resolveStudent(rawId);
    case 'batch':
      return resolveBatch(rawId);
    case 'section':
      return resolveSection(rawId);
    case 'faculty':
      return resolveFaculty(rawId);
    default:
      return null;
  }
}

const offeringIdsForSections = async (sectionIds) =>
  sectionIds.length === 0
    ? []
    : (
        await prisma.courseOffering.findMany({
          where: { sectionId: { in: sectionIds } },
          select: { id: true },
        })
      ).map((o) => o.id);

/** Course offerings are addressed by `publicId` in URLs, never the numeric id. */
async function resolveCourse(publicId) {
  const offering = await prisma.courseOffering.findUnique({
    where: { publicId: String(publicId) },
    select: {
      id: true,
      course: { select: { code: true, name: true } },
      teacher: { select: { full_name: true } },
      section: {
        select: { id: true, name: true, batch: { select: { id: true, name: true } } },
      },
      semester: { select: { name: true } },
      academicYear: { select: { name: true } },
    },
  });
  if (!offering) return null;

  const studentIds = (
    await prisma.studentRegistration.findMany({
      where: { batchSectionId: offering.section.id, status: 'ACTIVE' },
      select: { studentId: true },
    })
  ).map((r) => r.studentId);

  return {
    subject: {
      id: publicId,
      name: `${offering.course.code} — ${offering.course.name}`,
      subtitle: `${offering.section.batch.name} · Section ${offering.section.name}`,
      meta: [
        { label: 'Teacher', value: offering.teacher?.full_name ?? 'Unassigned' },
        { label: 'Semester', value: offering.semester?.name ?? '—' },
        { label: 'Academic year', value: offering.academicYear?.name ?? '—' },
        { label: 'Students', value: String(studentIds.length) },
      ],
    },
    offeringIds: [offering.id],
    studentIds,
    facultyIds: null,
    batchIds: [offering.section.batch.id],
    sectionIds: [offering.section.id],
  };
}

async function resolveTeacher(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;
  const teacher = await prisma.user.findUnique({
    where: { id },
    select: { id: true, full_name: true, email: true, number: true },
  });
  if (!teacher) return null;

  const offerings = await prisma.courseOffering.findMany({
    where: { teacherId: id },
    select: { id: true, sectionId: true },
  });

  return {
    subject: {
      id,
      name: teacher.full_name,
      subtitle: teacher.email,
      meta: [
        { label: 'Staff number', value: teacher.number ?? '—' },
        { label: 'Courses taught', value: String(offerings.length) },
      ],
    },
    offeringIds: offerings.map((o) => o.id),
    // Teacher reports measure what the teacher produced, not what they answered.
    studentIds: null,
    facultyIds: null,
    batchIds: null,
    sectionIds: [...new Set(offerings.map((o) => o.sectionId))],
  };
}

async function resolveStudent(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;
  const student = await prisma.user.findUnique({
    where: { id },
    select: { id: true, full_name: true, email: true, number: true },
  });
  if (!student) return null;

  const registrations = await prisma.studentRegistration.findMany({
    where: { studentId: id },
    select: {
      batchSectionId: true,
      status: true,
      batchSection: {
        select: { name: true, batch: { select: { id: true, name: true } } },
      },
    },
  });
  const sectionIds = [...new Set(registrations.map((r) => r.batchSectionId))];
  const offeringIds = await offeringIdsForSections(sectionIds);
  const current = registrations[0];

  return {
    subject: {
      id,
      name: student.full_name,
      subtitle: student.email,
      meta: [
        { label: 'Student number', value: student.number ?? '—' },
        { label: 'Batch', value: current?.batchSection?.batch?.name ?? '—' },
        { label: 'Section', value: current?.batchSection?.name ?? '—' },
        { label: 'Courses', value: String(offeringIds.length) },
      ],
    },
    offeringIds,
    studentIds: [id],
    facultyIds: null,
    batchIds: [...new Set(registrations.map((r) => r.batchSection?.batch?.id).filter(Boolean))],
    sectionIds,
  };
}

async function resolveBatch(batchId) {
  const id = Number(batchId);
  if (!Number.isFinite(id)) return null;
  const batch = await prisma.batch.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      academic_year: true,
      program: { select: { name: true, code: true } },
      sections: { select: { id: true, name: true } },
    },
  });
  if (!batch) return null;

  const sectionIds = batch.sections.map((s) => s.id);
  const offeringIds = await offeringIdsForSections(sectionIds);
  const studentIds = (
    await prisma.studentRegistration.findMany({
      where: { batchSectionId: { in: sectionIds }, status: 'ACTIVE' },
      select: { studentId: true },
    })
  ).map((r) => r.studentId);

  return {
    subject: {
      id,
      name: batch.name,
      subtitle: batch.program?.name ?? null,
      meta: [
        { label: 'Programme', value: batch.program?.code ?? '—' },
        { label: 'Status', value: batch.status },
        { label: 'Sections', value: String(sectionIds.length) },
        { label: 'Students', value: String(new Set(studentIds).size) },
      ],
    },
    offeringIds,
    studentIds: [...new Set(studentIds)],
    facultyIds: null,
    batchIds: [id],
    sectionIds,
  };
}

async function resolveSection(sectionId) {
  const id = Number(sectionId);
  if (!Number.isFinite(id)) return null;
  const section = await prisma.batchSection.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      batch: {
        select: {
          id: true,
          name: true,
          program: { select: { code: true, name: true } },
        },
      },
    },
  });
  if (!section) return null;

  const offeringIds = await offeringIdsForSections([id]);
  const studentIds = (
    await prisma.studentRegistration.findMany({
      where: { batchSectionId: id, status: 'ACTIVE' },
      select: { studentId: true },
    })
  ).map((r) => r.studentId);

  return {
    subject: {
      id,
      name: section.name,
      subtitle: section.batch?.name ?? null,
      meta: [
        { label: 'Batch', value: section.batch?.name ?? '—' },
        { label: 'Programme', value: section.batch?.program?.code ?? '—' },
        { label: 'Students', value: String(new Set(studentIds).size) },
        { label: 'Courses', value: String(offeringIds.length) },
      ],
    },
    offeringIds,
    studentIds: [...new Set(studentIds)],
    facultyIds: null,
    batchIds: section.batch ? [section.batch.id] : [],
    sectionIds: [id],
  };
}

async function resolveFaculty(facultyId) {
  const id = Number(facultyId);
  if (!Number.isFinite(id)) return null;
  const faculty = await prisma.faculty.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      dean: { select: { full_name: true } },
      departments: {
        select: { id: true, programs: { select: { batches: { select: { id: true } } } } },
      },
    },
  });
  if (!faculty) return null;

  const batchIds = faculty.departments.flatMap((d) =>
    d.programs.flatMap((p) => p.batches.map((b) => b.id))
  );
  const sections = await prisma.batchSection.findMany({
    where: { batchId: { in: batchIds } },
    select: { id: true },
  });
  const sectionIds = sections.map((s) => s.id);
  const offeringIds = await offeringIdsForSections(sectionIds);
  const studentIds = (
    await prisma.studentRegistration.findMany({
      where: { batchSectionId: { in: sectionIds }, status: 'ACTIVE' },
      select: { studentId: true },
    })
  ).map((r) => r.studentId);

  return {
    subject: {
      id,
      name: faculty.name,
      subtitle: faculty.code,
      meta: [
        { label: 'Dean', value: faculty.dean?.full_name ?? 'Unassigned' },
        { label: 'Departments', value: String(faculty.departments.length) },
        { label: 'Batches', value: String(batchIds.length) },
        { label: 'Students', value: String(new Set(studentIds).size) },
      ],
    },
    offeringIds,
    studentIds: [...new Set(studentIds)],
    facultyIds: [id],
    batchIds,
    sectionIds,
  };
}
