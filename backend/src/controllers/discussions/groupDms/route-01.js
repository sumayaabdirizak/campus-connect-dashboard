/**
 * Group DMs (3–10 members, no 1:1). Mounted at `/api/discussions`.
 */

import express from "express";
import { prisma } from "../../../db/prisma.js";
import { apiErrorBody } from "../../../utils/apiEnvelope.js";
import { getIo } from "../../../socket/hub.js";
import { buildUnreadSocketPayload } from "../../../features/discussions/buildUnreadPayload.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../../features/discussions/discussionPagination.js";
import { getDiscussionCallerUserId } from "../../../features/discussions/discussionCaller.js";
import {
  createGroupDmSchema,
  groupDmSendMessageSchema,
  addGroupDmMembersSchema,
} from "../../../features/discussions/validation/groupDiscussionSchemas.js";

import { getActiveMember } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get("/group-dms", async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
  
      const rows = await prisma.groupDmMember.findMany({
        where: { userId, leftAt: null, groupDm: { archivedAt: null } },
        include: {
          groupDm: {
            include: {
              members: {
                where: { leftAt: null },
                take: 8,
                include: { user: { select: { id: true, full_name: true, avatarUrl: true } } },
              },
              messages: {
                take: 1,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                where: { deletedAt: null },
                include: { sender: { select: { id: true, full_name: true, avatarUrl: true } } },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      });
  
      const results = rows.map((r) => {
        const g = r.groupDm;
        const last = g.messages?.[0] ?? null;
        return {
          id: g.publicId,
          name: g.name,
          iconUrl: g.iconUrl,
          createdAt: g.createdAt,
          memberCount: g.members?.length ?? 0,
          previewMembers: (g.members || []).map((m) => ({
            id: m.user.id,
            full_name: m.user.full_name,
            avatarUrl: m.user.avatarUrl,
          })),
          lastMessage: last
            ? {
                id: last.id,
                content: last.content,
                ciphertext: last.ciphertext,
                messageType: last.messageType,
                createdAt: last.createdAt,
                sender: last.sender,
              }
            : null,
          myRole: r.role,
        };
      });
  
      return res.json({ results });
    } catch (error) {
      console.error("GET /discussions/group-dms failed", error);
      return res.status(500).json(apiErrorBody("Failed to list group DMs", null));
    }
  });
}
