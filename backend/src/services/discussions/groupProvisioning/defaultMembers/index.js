import { DISCUSSION_SCOPE_TYPES } from "../../policy.js";
import { getBatchDefaultMembers } from "./batch.js";
import { getDepartmentDefaultMembers } from "./department.js";
import { getFacultyDefaultMembers } from "./faculty.js";
import { getSectionDefaultMembers } from "./section.js";

export async function getDefaultMembersForScope(tx, { scopeType, scopeId }) {
  if (scopeType === DISCUSSION_SCOPE_TYPES.FACULTY) {
    return getFacultyDefaultMembers(tx, scopeId);
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.DEPARTMENT) {
    return getDepartmentDefaultMembers(tx, scopeId);
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.BATCH) {
    return getBatchDefaultMembers(tx, scopeId);
  }
  if (scopeType === DISCUSSION_SCOPE_TYPES.SECTION) {
    return getSectionDefaultMembers(tx, scopeId);
  }
  return [];
}
