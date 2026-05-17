import { prisma } from "../src/db/prisma.js";
import { computeAnnouncementAnalytics } from "../src/features/announcements/services/announcementAnalytics.service.js";

const id = Number(process.argv[2] || 8);
try {
  const d = await computeAnnouncementAnalytics(prisma, id);
  console.log(JSON.stringify(d, null, 2));
} catch (e) {
  console.error("ERR", e?.name, e?.message);
  console.error(e?.stack);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
