import {
  fetchOfferingWithScope,
  canAccessOfferingRead,
  canManageOfferingContent,
} from "../../utils/courseOfferingAccess.js";

export function requireCourseOfferingRead() {
  return async (req, res, next) => {
    const offering = await fetchOfferingWithScope(req.params.courseOfferingId);
    if (!offering) return res.status(404).json({ message: "Course offering not found" });
    if (!(await canAccessOfferingRead(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.courseOffering = offering;
    next();
  };
}

export function requireCourseOfferingManage() {
  return async (req, res, next) => {
    const offering = await fetchOfferingWithScope(req.params.courseOfferingId);
    if (!offering) return res.status(404).json({ message: "Course offering not found" });
    if (!(await canManageOfferingContent(req.user, offering))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.courseOffering = offering;
    next();
  };
}
