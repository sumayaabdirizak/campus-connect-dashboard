import { prisma } from "../db/prisma.js";
import { checkFacultyAccess, getAuthFacultyId } from "../utils/facultyAccess.js";
import { syncDiscussionMembershipsForUser } from "../features/discussions/membershipSync.service.js";

export async function listLecturerProfiles(user) {
  const where = {};
  if (user.role === "FACULTY_ADMIN") {
    const fid = getAuthFacultyId(user);
    if (fid == null) where.id = -1;
    else where.department = { facultyId: fid };
  }

  return prisma.lecturerProfile.findMany({
    where,
    include: {
      user: true,
      department: true,
      faculties: { include: { faculty: true } },
    },
    orderBy: { id: "desc" },
  });
}

export async function createLecturerProfile(user, { user_id, staff_id, department_id }) {
  const dept = await prisma.department.findUnique({
    where: { id: Number(department_id) },
  });

  if (!dept || !checkFacultyAccess(user, dept.facultyId)) {
    throw new Error("Ma haysatid ogolaansho aad profile macalin kaga abuurto waaxdan/kuliyadan");
  }

  const profile = await prisma.lecturerProfile.create({
    data: {
      userId: Number(user_id),
      departmentId: dept.id,
      specialty: staff_id ? String(staff_id) : "General",
      faculties: {
        create: [{ facultyId: dept.facultyId }],
      },
    },
    include: {
      user: true,
      department: true,
      faculties: { include: { faculty: true } },
    },
  });
  await syncDiscussionMembershipsForUser(profile.userId);
  return profile;
}

export async function getLecturerProfileById(user, id) {
  const profile = await prisma.lecturerProfile.findUnique({
    where: { id: Number(id) },
    include: { department: true },
  });

  if (!profile) return null;
  if (!checkFacultyAccess(user, profile.department.facultyId)) {
    return null;
  }

  return prisma.lecturerProfile.findUnique({
    where: { id: Number(id) },
    include: {
      user: true,
      department: true,
      faculties: { include: { faculty: true } },
    },
  });
}

export async function updateLecturerProfile(user, id, data) {
  const profile = await getLecturerProfileById(user, id);
  if (!profile) throw new Error("Profile-ka macalinkas lama helin ama ma lihid ogolaansho");

  const updateData = {};
  if (data.specialty != null) updateData.specialty = String(data.specialty);

  const newDeptId = data.departmentId ?? data.department_id;
  if (newDeptId != null) {
    const dept = await prisma.department.findUnique({
      where: { id: Number(newDeptId) },
    });
    if (!dept || !checkFacultyAccess(user, dept.facultyId)) {
      throw new Error("Ma haysatid ogolaansho aad waaxdan cusub u wareejiso profile-ka macalinka");
    }
    updateData.departmentId = dept.id;
  }

  const updated = await prisma.lecturerProfile.update({
    where: { id: Number(id) },
    data: updateData,
    include: {
      user: true,
      department: true,
      faculties: { include: { faculty: true } },
    },
  });
  await syncDiscussionMembershipsForUser(updated.userId);
  return updated;
}

export async function deleteLecturerProfile(user, id) {
  const profile = await getLecturerProfileById(user, id);
  if (!profile) throw new Error("Profile-ka macalinkas lama helin ama ma lihid ogolaansho");

  const deleted = await prisma.lecturerProfile.delete({
    where: { id: Number(id) },
  });
  await syncDiscussionMembershipsForUser(deleted.userId);
  return deleted;
}
