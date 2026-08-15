/**
 * Debug script to check why club feed returns "Forbidden"
 * Checks: club existence, owner membership, server provisioning, auth
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get cyber-securit club (or the most recently created club)
  const club = await prisma.club.findFirst({
    where: { slug: 'cyber-securit' },
    include: {
      owner: { select: { id: true, full_name: true, email: true } },
      server: { select: { id: true, status: true } },
    },
  });

  if (!club) {
    console.log('❌ Club not found');
    return;
  }

  console.log('\n📋 Club Info:');
  console.log(`  ID: ${club.id}, Slug: ${club.slug}`);
  console.log(`  Owner: ${club.owner?.full_name} (ID: ${club.ownerId})`);
  console.log(`  Server ID: ${club.serverId}, Status: ${club.server?.status}`);

  if (!club.serverId) {
    console.log('\n❌ Club has no server provisioned!');
    return;
  }

  // Check owner membership in the server
  const ownerMembership = await prisma.discussionGroupMembership.findUnique({
    where: { groupId_userId: { groupId: club.serverId, userId: club.ownerId } },
    select: { id: true, role: true, isActive: true, leftAt: true, canPost: true, canModerate: true },
  });

  console.log('\n👤 Owner Membership in Server:');
  if (!ownerMembership) {
    console.log('  ❌ NO MEMBERSHIP ROW EXISTS!');
  } else {
    console.log(`  ID: ${ownerMembership.id}`);
    console.log(`  Role: ${ownerMembership.role}`);
    console.log(`  Active: ${ownerMembership.isActive}`);
    console.log(`  LeftAt: ${ownerMembership.leftAt}`);
    console.log(`  CanPost: ${ownerMembership.canPost}`);
    console.log(`  CanModerate: ${ownerMembership.canModerate}`);
  }

  // Check all memberships for this club
  const allMembers = await prisma.discussionGroupMembership.count({
    where: { groupId: club.serverId, leftAt: null, isActive: true },
  });

  console.log(`\n📊 Total Active Members: ${allMembers}`);
  console.log(`   Cached Count: ${club.memberCountCache}`);

  // Check if there are any inactive members that shouldn't be
  const inactiveMembers = await prisma.discussionGroupMembership.findMany({
    where: { groupId: club.serverId, isActive: false },
    select: { userId: true, user: { select: { full_name: true } }, leftAt: true },
    take: 5,
  });

  if (inactiveMembers.length > 0) {
    console.log(`\n⚠️  Inactive Members (first 5):`);
    inactiveMembers.forEach((m) => {
      console.log(`  - ${m.user?.full_name} (left: ${m.leftAt})`);
    });
  }
}

main()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
