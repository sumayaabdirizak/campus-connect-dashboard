import { prisma } from "../db/prisma.js";
import { syncDiscussionMembershipsForUser } from "../features/discussions/membershipSync.service.js";

/**
 * Liiska dhammaan profiles-ka haddii uu yahay SUPER_ADMIN,
 * ama profile-kiisa oo kaliya haddii uu yahay FACULTY_ADMIN.
 */
export async function listFacultyAdminProfiles(user) {
  const where = {};
  if (user.role === "FACULTY_ADMIN") {
    where.user_id = user.sub;
  }

  return prisma.facultyAdminProfile.findMany({
    where,
    include: {
      user: true,
      faculty: true,
    },
    orderBy: { faculty_admin_id: "desc" },
  });
}

/**
 * Abuur xiriir cusub oo u dhexeeya User iyo Faculty.
 */
export async function createFacultyAdminProfile({ user_id, faculty_id }) {
  const profile = await prisma.facultyAdminProfile.create({
    data: {
      user_id: Number(user_id),
      faculty_id: Number(faculty_id),
    },
  });
  await syncDiscussionMembershipsForUser(profile.user_id);
  return profile;
}

/**
 * Soo saar profile gaar ah.
 */
export async function getFacultyAdminProfileById(user, id) {
  const profile = await prisma.facultyAdminProfile.findUnique({
    where: { faculty_admin_id: Number(id) },
    include: {
      user: true,
      faculty: true,
    },
  });

  if (!profile) return null;

  // Haddii uu yahay FACULTY_ADMIN, wuxuu arki karaa uun profile-kiisa
  if (user.role === "FACULTY_ADMIN" && profile.user_id !== user.sub) {
    return null;
  }

  return profile;
}

/**
 * Beddel xogta profile-ka (tusaale kuliyadda looga soo wareejiyo).
 */
export async function updateFacultyAdminProfile(user, id, data) {
  const profile = await getFacultyAdminProfileById(user, id);
  if (!profile) throw new Error("Profile-kan lama helin ama ma haysatid ogolaansho");

  // Kaliya SUPER_ADMIN ayaa beddeli kara xogta profile-ka
  if (user.role !== "SUPER_ADMIN") {
    throw new Error("Kaliya Super Admin ayaa beddeli kara xogta profile-ka");
  }

  const updateData = { ...data };
  if (updateData.user_id) updateData.user_id = Number(updateData.user_id);
  if (updateData.faculty_id) updateData.faculty_id = Number(updateData.faculty_id);

  const updated = await prisma.facultyAdminProfile.update({
    where: { faculty_admin_id: Number(id) },
    data: updateData,
  });
  await syncDiscussionMembershipsForUser(updated.user_id);
  return updated;
}

/**
 * Tirtir profile-ka.
 */
export async function deleteFacultyAdminProfile(user, id) {
  const profile = await getFacultyAdminProfileById(user, id);
  if (!profile) throw new Error("Profile-kan lama helin ama ma haysatid ogolaansho");

  if (user.role !== "SUPER_ADMIN") {
    throw new Error("Kaliya Super Admin ayaa tirtiri kara profile-ka");
  }

  const deleted = await prisma.facultyAdminProfile.delete({
    where: { faculty_admin_id: Number(id) },
  });
  await syncDiscussionMembershipsForUser(deleted.user_id);
  return deleted;
}
