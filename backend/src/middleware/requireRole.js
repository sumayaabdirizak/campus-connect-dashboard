import { apiErrorBody } from "../utils/apiEnvelope.js";

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json(apiErrorBody("Unauthorized", null));
    if (!allowedRoles.includes(role))
      return res.status(403).json(apiErrorBody("Forbidden", { allowedRoles }));
    next();
  };
}