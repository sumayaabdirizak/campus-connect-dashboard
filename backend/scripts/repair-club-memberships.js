/**
 * Repairs two kinds of club membership drift:
 *
 *   1. Club owners whose DiscussionGroupMembership on their own club server is
 *      missing or deactivated. Without an active row the discussions layer
 *      rejects them (403), so an owner is locked out of their own club feed.
 *   2. `Club.memberCountCache` disagreeing with the real count of active
 *      memberships on the club's server.
 *
 * Both current write paths already refuse to remove an owner (leave.routes.js
 * and membersKick.routes.js), so this repairs historical rows rather than
 * compensating for a live bug.
 *
 * Dry run by default — prints what it would change and exits:
 *     node scripts/repair-club-memberships.js
 * Apply:
 *     node scripts/repair-club-memberships.js --apply
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const clubs = await prisma.club.findMany({
    where: { serverId: { not: null } },
    select: { id: true, slug: true, ownerId: true, serverId: true, memberCountCache: true },
    orderBy: { id: 'asc' },
  });

  const ownerFixes = [];
  const countFixes = [];

  // Pass 1 — owner memberships. Must run before the recount so a reactivated
  // owner is included in the new totals.
  for (const club of clubs) {
    if (!club.ownerId) continue;
    const row = await prisma.discussionGroupMembership.findUnique({
      where: { groupId_userId: { groupId: club.serverId, userId: club.ownerId } },
      select: { isActive: true, leftAt: true },
    });
    if (row && row.isActive && !row.leftAt) continue;

    ownerFixes.push({ slug: club.slug, ownerId: club.ownerId, was: row ? 'inactive' : 'missing' });
    if (APPLY) {
      await prisma.discussionGroupMembership.upsert({
        where: { groupId_userId: { groupId: club.serverId, userId: club.ownerId } },
        update: { role: 'DEAN', canPost: true, canModerate: true, isActive: true, leftAt: null },
        create: {
          groupId: club.serverId,
          userId: club.ownerId,
          role: 'DEAN',
          canPost: true,
          canModerate: true,
        },
      });
    }
  }

  // Pass 2 — resync the denormalised member count.
  for (const club of clubs) {
    const actual = await prisma.discussionGroupMembership.count({
      where: { groupId: club.serverId, leftAt: null, isActive: true },
    });
    if (actual === club.memberCountCache) continue;

    countFixes.push({ slug: club.slug, cached: club.memberCountCache, actual });
    if (APPLY) {
      await prisma.club.update({ where: { id: club.id }, data: { memberCountCache: actual } });
    }
  }

  const verb = APPLY ? 'Repaired' : 'Would repair';
  console.log(`Scanned ${clubs.length} provisioned club(s).`);
  console.log(`\n${verb} ${ownerFixes.length} owner membership(s):`);
  for (const f of ownerFixes) console.log(`  ${f.slug} — owner ${f.ownerId} (${f.was})`);
  console.log(`\n${verb} ${countFixes.length} member count(s):`);
  for (const f of countFixes) console.log(`  ${f.slug} — ${f.cached} → ${f.actual}`);
  if (!APPLY) console.log('\nDry run. Re-run with --apply to write these changes.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
