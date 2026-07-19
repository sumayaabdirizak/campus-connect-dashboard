import { prisma } from "../../../db/prisma.js";
import { ensureChannelForLegacyScopeGroup } from "./legacyChannel.js";
import { ensureFacultyServerSkeleton } from "./facultySkeleton.js";
import { translateMembershipsToOverwrites } from "./membershipOverwrites.js";
import {
  reparentFacultyMessagesToGeneral,
  reparentLegacyMessages,
} from "./messageReparent.js";

export async function runHybridBackfill({ prismaClient = prisma, dryRun = false } = {}) {
  const tx = prismaClient;
  const report = {
    facultiesProcessed: 0,
    legacyChannelsCreated: 0,
    legacyChannelsUpdated: 0,
    membershipOverwritesUpserted: 0,
    messagesReparented: 0,
    facultyMessagesReparented: 0,
    skipped: [],
  };

  if (dryRun) {
    const facultyCount = await tx.discussionGroup.count({
      where: { scopeType: "FACULTY" },
    });
    const legacyCount = await tx.discussionGroup.count({
      where: { scopeType: { in: ["DEPARTMENT", "BATCH", "SECTION"] } },
    });
    const membershipCount = await tx.discussionGroupMembership.count({
      where: { leftAt: null },
    });
    return { ...report, dryRun: true, facultyCount, legacyCount, membershipCount };
  }

  const facultyServers = await tx.discussionGroup.findMany({
    where: { scopeType: "FACULTY" },
    select: { id: true, scopeType: true, scopeId: true, name: true, defaultChannelId: true, kind: true },
  });

  for (const fac of facultyServers) {
    await ensureFacultyServerSkeleton(fac, tx);
    await reparentFacultyMessagesToGeneral(fac, tx).then((n) => {
      report.facultyMessagesReparented += n;
    });
    report.facultiesProcessed += 1;
  }

  const legacyGroups = await tx.discussionGroup.findMany({
    where: { scopeType: { in: ["DEPARTMENT", "BATCH", "SECTION"] } },
    select: { id: true, scopeType: true, scopeId: true, name: true },
  });

  for (const lg of legacyGroups) {
    const channel = await ensureChannelForLegacyScopeGroup(lg, tx);
    if (!channel) {
      report.skipped.push({
        groupId: lg.id,
        scopeType: lg.scopeType,
        scopeId: lg.scopeId,
        reason: "no parent faculty",
      });
      continue;
    }
    if (channel.createdAt && Date.now() - new Date(channel.createdAt).getTime() < 5 * 60 * 1000) {
      report.legacyChannelsCreated += 1;
    } else {
      report.legacyChannelsUpdated += 1;
    }
    const owCount = await translateMembershipsToOverwrites(lg, channel.id, tx);
    report.membershipOverwritesUpserted += owCount;
    const rc = await reparentLegacyMessages(lg.id, channel.id, tx);
    report.messagesReparented += rc;
  }

  return report;
}
