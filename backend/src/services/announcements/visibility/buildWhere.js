import {
  normalizeAnnouncementScope,
  buildTargetRolesWhere,
  buildStatusVisibilityWhere,
  buildLegacyPublishedWhere,
} from "./scope.js";
import { buildScopeOrClauses } from "./whereBuilder.js";

/** @param {import("./scope.js").VisibleAnnouncementUser} user */
export function buildVisibleAnnouncementsWhere(user) {
  const scope = normalizeAnnouncementScope(user);
  const base = {
    AND: [{ isActive: true }, buildStatusVisibilityWhere(user.id)],
  };
  const roleClause = buildTargetRolesWhere(user.role);
  const creatorClause = { createdById: user.id };

  if (scope.isSuperAdmin) {
    return { AND: [base, { OR: [roleClause, creatorClause] }] };
  }

  const or = buildScopeOrClauses(scope, user.role, true);
  return {
    AND: [base, { OR: [creatorClause, { AND: [{ OR: or }, roleClause] }] }],
  };
}

/** @param {import("./scope.js").VisibleAnnouncementUser} user */
export function buildVisibleAnnouncementsWhereLegacy(user) {
  const scope = normalizeAnnouncementScope(user);
  const base = {
    AND: [{ isActive: true }, buildLegacyPublishedWhere(user.id)],
  };
  const roleClause = buildTargetRolesWhere(user.role);
  const creatorClause = { createdById: user.id };

  if (scope.isSuperAdmin) {
    return { AND: [base, { OR: [roleClause, creatorClause] }] };
  }

  const or = buildScopeOrClauses(scope, user.role, false);
  return {
    AND: [base, { OR: [creatorClause, { AND: [{ OR: or }, roleClause] }] }],
  };
}
