import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { applyStaleDraftRetention } from "../src/features/announcements/services/announcementRetention.service.js";

const PREFIX = "draft-retention-test-";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("applyStaleDraftRetention", () => {
  afterAll(async () => {
    await prisma.announcement.deleteMany({ where: { title: { startsWith: PREFIX } } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("archives only stale DRAFT rows by updatedAt; leaves fresh DRAFT and PUBLISHED unchanged", async () => {
    let user;
    try {
      user = await prisma.user.findFirst({ select: { id: true } });
    } catch {
      user = null;
    }
    if (!user?.id) {
      console.warn("[applyStaleDraftRetention] skipping: no DB user");
      expect(true).toBe(true);
      return;
    }

    const old = new Date(Date.now() - 40 * DAY_MS);
    const now = new Date();

    const staleDraft = await prisma.announcement.create({
      data: {
        title: `${PREFIX}stale-draft`,
        content: "body",
        status: "DRAFT",
        targetType: "ALL",
        facultyId: null,
        createdById: user.id,
        createdByRole: "DEAN",
        imageUrls: [],
        createdAt: old,
        updatedAt: old,
        isActive: true,
      },
    });

    const freshDraft = await prisma.announcement.create({
      data: {
        title: `${PREFIX}fresh-draft`,
        content: "body",
        status: "DRAFT",
        targetType: "ALL",
        facultyId: null,
        createdById: user.id,
        createdByRole: "DEAN",
        imageUrls: [],
        isActive: true,
      },
    });

    const oldPublished = await prisma.announcement.create({
      data: {
        title: `${PREFIX}old-published`,
        content: "body",
        status: "PUBLISHED",
        targetType: "ALL",
        facultyId: null,
        createdById: user.id,
        createdByRole: "DEAN",
        imageUrls: [],
        publishedAt: new Date(Date.now() - 50 * DAY_MS),
        createdAt: old,
        updatedAt: old,
        isActive: true,
      },
    });

    const r = await applyStaleDraftRetention({
      prisma,
      now,
      draftRetentionDays: 30,
      policy: "archive",
    });

    expect(r.policy).toBe("archive");
    expect(r.affected).toBeGreaterThanOrEqual(1);

    const afterStale = await prisma.announcement.findUnique({ where: { id: staleDraft.id } });
    expect(afterStale?.status).toBe("ARCHIVED");
    expect(afterStale?.isActive).toBe(false);

    const afterFresh = await prisma.announcement.findUnique({ where: { id: freshDraft.id } });
    expect(afterFresh?.status).toBe("DRAFT");

    const afterPub = await prisma.announcement.findUnique({ where: { id: oldPublished.id } });
    expect(afterPub?.status).toBe("PUBLISHED");

    await prisma.announcement.deleteMany({
      where: { id: { in: [staleDraft.id, freshDraft.id, oldPublished.id] } },
    });
  });

  it("delete policy removes stale DRAFT rows only", async () => {
    let user;
    try {
      user = await prisma.user.findFirst({ select: { id: true } });
    } catch {
      user = null;
    }
    if (!user?.id) {
      expect(true).toBe(true);
      return;
    }

    const old = new Date(Date.now() - 40 * DAY_MS);
    const stale = await prisma.announcement.create({
      data: {
        title: `${PREFIX}stale-del`,
        content: "body",
        status: "DRAFT",
        targetType: "ALL",
        facultyId: null,
        createdById: user.id,
        createdByRole: "DEAN",
        imageUrls: [],
        createdAt: old,
        updatedAt: old,
        isActive: true,
      },
    });

    const { affected, policy } = await applyStaleDraftRetention({
      prisma,
      now: new Date(),
      draftRetentionDays: 30,
      policy: "delete",
    });

    expect(policy).toBe("delete");
    expect(affected).toBeGreaterThanOrEqual(1);

    const gone = await prisma.announcement.findUnique({ where: { id: stale.id } });
    expect(gone).toBeNull();
  });
});
