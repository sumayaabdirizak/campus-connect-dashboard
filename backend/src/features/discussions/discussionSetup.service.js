import { backfillMissingDiscussionGroups } from "./groupProvisioning.service.js";
import { runHybridBackfill } from "./serverHierarchy.service.js";
import { runDiscussionMembershipNightlySync } from "./membershipSync.service.js";

/**
 * One-shot local / post-migrate setup so Chat works:
 * 1) Ensure DiscussionGroup per faculty/dept/batch/section (+ faculty server skeleton).
 * 2) Sync DiscussionGroupMembership from academic profiles & registrations.
 * 3) Map legacy groups to channels and mirror memberships into overwrites.
 *
 * Order matters: hybrid translate reads legacy memberships, so memberships run before hybrid.
 *
 * @param {import("@prisma/client").PrismaClient} [prismaClient]
 */
export async function runFullDiscussionSetup(prismaClient) {
  await backfillMissingDiscussionGroups(prismaClient);
  const membershipResults = await runDiscussionMembershipNightlySync(prismaClient);
  const hybridReport = await runHybridBackfill({ prismaClient, dryRun: false });
  return {
    usersSynced: Array.isArray(membershipResults) ? membershipResults.length : 0,
    hybridReport,
  };
}
