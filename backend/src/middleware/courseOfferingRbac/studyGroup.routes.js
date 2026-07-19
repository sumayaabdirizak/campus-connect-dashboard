import {
  fetchOfferingWithScope,
  canAccessOfferingRead,
  canManageOfferingContent,
} from "../../utils/courseOfferingAccess.js";

async function loadGroupById(req) {
  const { prisma } = await import("../../db/prisma.js");
  const id = parseInt(req.params.groupId, 10);
  if (!Number.isInteger(id)) return null;
  const group = await prisma.courseGroup.findUnique({
    where: { id },
    select: { id: true, courseOfferingId: true },
  });
  if (!group?.courseOfferingId) return null;
  const offering = await fetchOfferingWithScope(group.courseOfferingId);
  if (!offering) return null;
  req.studyGroup = group;
  req.courseOffering = offering;
  return { group, offering };
}

export function requireStudyGroupManage() {
  return async (req, res, next) => {
    const loaded = await loadGroupById(req);
    if (!loaded) return res.status(404).json({ message: "Group not found" });
    if (!(await canManageOfferingContent(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export function requireStudyGroupAccess() {
  return async (req, res, next) => {
    const loaded = await loadGroupById(req);
    if (!loaded) return res.status(404).json({ message: "Group not found" });
    if (!(await canAccessOfferingRead(req.user, loaded.offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
