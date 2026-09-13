import { applyDeanScopes } from "./deanScopes.js";
import { applyLeadershipScopes } from "./leadershipScopes.js";
import { applyProfileScopes } from "./profileScopes.js";
import { applyClubScopes } from "./clubScopes.js";

export async function buildDesiredScopesForUser(tx, user) {
  const desiredByScope = new Map();
  await applyDeanScopes(tx, user, desiredByScope);
  await applyProfileScopes(tx, user, desiredByScope);
  await applyLeadershipScopes(tx, user, desiredByScope);
  await applyClubScopes(tx, user, desiredByScope);
  return desiredByScope;
}

export { userSyncSelect } from "./userSyncSelect.js";
