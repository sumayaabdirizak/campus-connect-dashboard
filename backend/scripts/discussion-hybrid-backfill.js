/**
 * One-shot hybrid academic + Discord backfill.
 *
 * Usage:
 *   node scripts/discussion-hybrid-backfill.js --dry-run
 *   node scripts/discussion-hybrid-backfill.js --apply
 */

import { runHybridBackfill } from "../src/features/discussions/serverHierarchy.service.js";
import { prisma } from "../src/db/prisma.js";

const dryRun = process.argv.includes("--dry-run");
const apply = process.argv.includes("--apply");

async function main() {
  if (!dryRun && !apply) {
    console.error("Pass --dry-run or --apply");
    process.exit(1);
  }
  const report = await runHybridBackfill({ dryRun });
  console.log(JSON.stringify(report, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
