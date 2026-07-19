/**
 * Discord-style permission engine for the Discussion module.
 * Implementation split under ./permissions/; this file preserves the public import path.
 */
export {
  PERMISSION_BITS,
  PERMISSION_ADMINISTRATOR,
  PERMISSION_ALL,
  SYSTEM_ROLE_KEYS,
  SYSTEM_ROLE_DEFAULTS,
} from "./permissions/constants.js";
export { hasPermission, combine } from "./permissions/bitHelpers.js";
export {
  mapGlobalRoleToSystemRoleKey,
  mapClubMembershipRoleToSystemKey,
} from "./permissions/roleMapping.js";
export { computeChannelPermissions } from "./permissions/computeChannelPermissions.js";
export { computeChannelPermissionsForServer } from "./permissions/computeChannelPermissionsForServer.js";
export { computeServerPermissions } from "./permissions/computeServerPermissions.js";
export { requireChannelPermission, requireServerPermission } from "./permissions/middleware.js";
