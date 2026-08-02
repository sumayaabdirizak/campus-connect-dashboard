import { backfillMissingDiscussionGroups } from "./groupProvisioning.service.js";
import { runHybridBackfill } from "./serverHierarchy.service.js";
import { runDiscussionMembershipNightlySync } from "./membershipSync.service.js";

/**
 * Idempotent post-seed discussion bootstrap: scope groups → hybrid channels → memberships.
 */
export async function runFullDiscussionSetup(prismaClient) {
  await backfillMissingDiscussionGroups(prismaClient);
  const hybrid = await runHybridBackfill({ prismaClient, dryRun: false });
  const memberships = await runDiscussionMembershipNightlySync(prismaClient);
  return { hybrid, memberships };
}
