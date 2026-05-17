import { prisma } from "../db/prisma.js";
import { checkFacultyAccess, getAuthFacultyId } from "../utils/facultyAccess.js";
import { syncDiscussionMembershipsForUser } from "../features/discussions/membershipSync.service.js";

export async function listStudentProfiles(user) {
  const where = {};
  if (user.role === "FACULTY_ADMIN") {
    const fid = getAuthFacultyId(user);
    if (fid == null) where.id = -1;
    else where.facultyId = fid;
  }

  return prisma.studentProfile.findMany({
    where,
    include: {
      user: true,
      program: { include: { department: true } },
    },
    orderBy: { id: "desc" },
  });
}

export async function createStudentProfile(user, { user_id, reg_no, admission_year, program_id }) {
  const program = await prisma.program.findUnique({
    where: { id: Number(program_id) },
    include: { department: true },
  });

  if (!program || !checkFacultyAccess(user, program.department.facultyId)) {
    throw new Error("Ma haysatid ogolaansho aad profile arday uga abuurto barnaamijkan/kuliyadan");
  }

  const profile = await prisma.studentProfile.create({
    data: {
      userId: Number(user_id),
      student_number: String(reg_no),
      admission_year: Number(admission_year),
      facultyId: program.department.facultyId,
      departmentId: program.departmentId,
      programId: program.id,
    },
    include: {
      user: true,
      program: { include: { department: true } },
    },
  });
  await syncDiscussionMembershipsForUser(profile.userId);
  return profile;
}

export async function getStudentProfileById(user, id) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: Number(id) },
    include: {
      program: { include: { department: true } },
    },
  });

  if (!profile) return null;
  if (!checkFacultyAccess(user, profile.program.department.facultyId)) {
    return null;
  }

  return prisma.studentProfile.findUnique({
    where: { id: Number(id) },
    include: {
      user: true,
      program: { include: { department: true } },
    },
  });
}

export async function updateStudentProfile(user, id, data) {
  const profile = await getStudentProfileById(user, id);
  if (!profile) throw new Error("Profile-ka ardaygan lama helin ama ma lihid ogolaansho");

  const updateData = {};
  if (data.student_number != null) updateData.student_number = String(data.student_number);
  if (data.admission_year != null) updateData.admission_year = Number(data.admission_year);
  if (data.programId != null || data.program_id != null) {
    const pid = Number(data.programId ?? data.program_id);
    const program = await prisma.program.findUnique({
      where: { id: pid },
      include: { department: true },
    });
    if (!program || !checkFacultyAccess(user, program.department.facultyId)) {
      throw new Error("Ma haysatid ogolaansho aad barnaamijkan ugu wareejiso profile-ka ardayga");
    }
    updateData.programId = program.id;
    updateData.departmentId = program.departmentId;
    updateData.facultyId = program.department.facultyId;
  }

  const updated = await prisma.studentProfile.update({
    where: { id: Number(id) },
    data: updateData,
    include: {
      user: true,
      program: { include: { department: true } },
    },
  });
  await syncDiscussionMembershipsForUser(updated.userId);
  return updated;
}

export async function deleteStudentProfile(user, id) {
  const profile = await getStudentProfileById(user, id);
  if (!profile) throw new Error("Profile-ka ardaygan lama helin ama ma lihid ogolaansho");

  const deleted = await prisma.studentProfile.delete({
    where: { id: Number(id) },
  });
  await syncDiscussionMembershipsForUser(deleted.userId);
  return deleted;
}
