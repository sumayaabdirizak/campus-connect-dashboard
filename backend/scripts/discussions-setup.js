/**
 * Idempotent discussion + hybrid setup for a database (local or CI).
 *
 *   node scripts/discussions-setup.js
 *
 * Also runs automatically at the end of `prisma db seed` when academic data exists.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { runFullDiscussionSetup } from "../src/features/discussions/discussionSetup.service.js";

async function main() {
  console.log("Running full discussion setup (groups → memberships → hybrid)…");
  const out = await runFullDiscussionSetup(prisma);
  console.log(
    JSON.stringify(
      out,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
