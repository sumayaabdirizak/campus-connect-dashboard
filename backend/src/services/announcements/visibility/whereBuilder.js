/**
 * @param {import("./scope.js").AnnouncementScope} scope
 * @param {string} userRole
 * @param {boolean} includeTargetRows
 */
export function buildScopeOrClauses(scope, userRole, includeTargetRows) {
  const toArray = (set) => Array.from(set);
  const or = [];
  const role = String(userRole || "").toUpperCase();
  // Dean + faculty Dean's Office staff: university Everyone + own-faculty ALL.
  const facultyPublisher = role === "DEAN";

  if (facultyPublisher) {
    const primaryFacultyId = toArray(scope.facultyIds)[0];
    or.push({ AND: [{ targetType: "ALL" }, { facultyId: null }] });
    if (primaryFacultyId != null) {
      or.push({ AND: [{ targetType: "ALL" }, { facultyId: primaryFacultyId }] });
    }
  } else {
    or.push({ targetType: "ALL" });
  }

  if (scope.facultyIds.size > 0) or.push({ facultyId: { in: toArray(scope.facultyIds) } });
  if (scope.departmentIds.size > 0) or.push({ departmentId: { in: toArray(scope.departmentIds) } });
  if (scope.batchIds.size > 0) or.push({ batchId: { in: toArray(scope.batchIds) } });
  if (scope.sectionIds.size > 0) or.push({ sectionId: { in: toArray(scope.sectionIds) } });

  if (includeTargetRows) {
    const targetRowScopes = [];
    if (scope.facultyIds.size > 0) {
      targetRowScopes.push({ scopeType: "FACULTY", scopeId: { in: toArray(scope.facultyIds) } });
    }
    if (scope.departmentIds.size > 0) {
      targetRowScopes.push({ scopeType: "DEPARTMENT", scopeId: { in: toArray(scope.departmentIds) } });
    }
    if (scope.batchIds.size > 0) {
      targetRowScopes.push({ scopeType: "BATCH", scopeId: { in: toArray(scope.batchIds) } });
    }
    if (scope.sectionIds.size > 0) {
      targetRowScopes.push({ scopeType: "SECTION", scopeId: { in: toArray(scope.sectionIds) } });
    }
    if (targetRowScopes.length > 0) {
      or.push({ targets: { some: { OR: targetRowScopes } } });
    }
  }

  return or;
}
