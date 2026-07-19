import express from "express";
import { prisma } from "../../../../db/prisma.js";
import { apiErrorBody } from "../../../../utils/apiEnvelope.js";

const router = express.Router();

router.get("/me/groups", async (req, res) => {
  try {
    const userId = Number(req.user?.sub);
    const memberships = await prisma.discussionGroupMembership.findMany({
      where: { userId, leftAt: null, isActive: true, group: { status: "ACTIVE" } },
      include: {
        group: {
          include: {
            messages: {
              take: 1,
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              include: { sender: { select: { id: true, full_name: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const groupIds = memberships.map((m) => m.groupId);
    const unreadCounts = groupIds.length
      ? await prisma.discussionNotification.groupBy({
          by: ["groupId"],
          where: { userId, readAt: null, groupId: { in: groupIds } },
          _count: { groupId: true },
        })
      : [];
    const unreadByGroup = new Map(unreadCounts.map((x) => [x.groupId, x._count.groupId]));

    const deptScopeIds = new Set();
    const batchScopeIds = new Set();
    const sectionScopeIds = new Set();
    for (const m of memberships) {
      const st = m.group.scopeType;
      if (st === "DEPARTMENT") deptScopeIds.add(m.group.scopeId);
      else if (st === "BATCH") batchScopeIds.add(m.group.scopeId);
      else if (st === "SECTION") sectionScopeIds.add(m.group.scopeId);
    }

    const [deptRows, batchRows, sectionRows] = await Promise.all([
      deptScopeIds.size
        ? prisma.department.findMany({
            where: { id: { in: [...deptScopeIds] } },
            select: { id: true, facultyId: true },
          })
        : [],
      batchScopeIds.size
        ? prisma.batch.findMany({
            where: { id: { in: [...batchScopeIds] } },
            select: { id: true, program: { select: { department: { select: { facultyId: true } } } } },
          })
        : [],
      sectionScopeIds.size
        ? prisma.batchSection.findMany({
            where: { id: { in: [...sectionScopeIds] } },
            select: {
              id: true,
              batch: { select: { program: { select: { department: { select: { facultyId: true } } } } } },
            },
          })
        : [],
    ]);

    const deptFaculty = new Map(deptRows.map((d) => [d.id, d.facultyId]));
    const batchFaculty = new Map(batchRows.map((b) => [b.id, b.program?.department?.facultyId ?? null]));
    const sectionFaculty = new Map(
      sectionRows.map((s) => [s.id, s.batch?.program?.department?.facultyId ?? null]),
    );

    const results = memberships.map((membership) => {
      const lastMessage = membership.group.messages?.[0] ?? null;
      const g = membership.group;
      let contextFacultyId = null;
      if (g.scopeType === "FACULTY") contextFacultyId = g.scopeId;
      else if (g.scopeType === "DEPARTMENT") contextFacultyId = deptFaculty.get(g.scopeId) ?? null;
      else if (g.scopeType === "BATCH") contextFacultyId = batchFaculty.get(g.scopeId) ?? null;
      else if (g.scopeType === "SECTION") contextFacultyId = sectionFaculty.get(g.scopeId) ?? null;
      return {
        groupId: membership.group.id,
        groupKey: membership.group.groupKey,
        name: membership.group.name,
        scopeType: membership.group.scopeType,
        scopeId: membership.group.scopeId,
        contextFacultyId,
        e2eeEnabled: membership.group.e2eeEnabled,
        e2eeCurrentKeyVersion: membership.group.e2eeCurrentKeyVersion,
        e2eeRotationRequired: membership.group.e2eeRotationRequired,
        myRole: membership.role,
        myCanPost: membership.canPost,
        myCanModerate: membership.canModerate,
        unreadCount: unreadByGroup.get(membership.group.id) ?? 0,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              ciphertext: lastMessage.ciphertext,
              messageType: lastMessage.messageType,
              createdAt: lastMessage.createdAt,
              sender: lastMessage.sender
                ? { id: lastMessage.sender.id, full_name: lastMessage.sender.full_name }
                : null,
            }
          : null,
      };
    });

    return res.json({ results });
  } catch (error) {
    console.error("GET /discussions/me/groups failed", error);
    return res.status(500).json(apiErrorBody("Failed to list discussion groups", null));
  }
});

export default router;
