import { prisma } from "../../../db/prisma.js";
import { whereUsersInFaculty as inFacultyWhere } from "../../../utils/scopeWhere.js";

export const assertInFaculty = async (userId, facultyId, res) => {
  const user = await prisma.user.findFirst({
    where: inFacultyWhere(facultyId, { id: userId }),
  });
  if (!user) {
    res.status(403).json({ message: "User does not belong to your faculty." });
    return null;
  }
  return user;
};
