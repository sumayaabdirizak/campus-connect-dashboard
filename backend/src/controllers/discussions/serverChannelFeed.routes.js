/**
 * Channel message feed routes.
 *
 *   GET  /channels/:channelId/messages  (?threadRoot=messageId for thread slice)
 *   POST /channels/:channelId/messages
 */

import express from "express";
import { prisma } from "../../db/prisma.js";
import { apiErrorBody, prismaSchemaDriftHint } from "../../utils/apiEnvelope.js";
import { getIo } from "../../socket/hub.js";
import {
  PERMISSION_BITS,
  hasPermission,
  requireChannelPermission,
} from "../../features/discussions/permissions.js";
import {
  filterMembershipRowsByChannelScope,
} from "../../features/discussions/channelScopeAccess.js";
import {
  mapChannelMessagesForViewer,
} from "../../features/discussions/serverChannelAccess.js";
import { emitDiscussionNotificationEvents } from "../../features/discussions/notificationEmit.js";
import { extractMentionHandles, resolveMentionUserIds } from "../../features/discussions/mentionResolution.js";
import {
  anonymousSafeSenderName,
  applyAnonymousSenderPolicy,
  deriveQuestionFields,
} from "../../features/discussions/discussionMessagePublic.js";
import {
  parseDiscussionHistoryLimit,
  encodeDiscussionCursor,
  decodeDiscussionCursor,
} from "../../features/discussions/discussionPagination.js";
import { getDiscussionCallerUserId } from "../../features/discussions/discussionCaller.js";
import { enrichDiscussionMessagesAttachments } from "../../features/discussions/discussionAttachments.js";
import { sendChannelMessageSchema } from "../../features/discussions/validation/serverSchemas.js";

const router = express.Router();

router.get(
  "/channels/:channelId/messages",
  requireChannelPermission(PERMISSION_BITS.READ_MESSAGE_HISTORY),
  async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      if (!userId) return res.status(401).json(apiErrorBody("Unauthorized", null));
      const channelId = req.discussionChannelId;
      const channelForMember = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: { serverId: true },
      });
      const channelMembership = channelForMember
        ? await prisma.discussionGroupMembership.findFirst({
            where: {
              groupId: channelForMember.serverId,
              userId,
              leftAt: null,
              isActive: true,
            },
          })
        : null;
      const limit = parseDiscussionHistoryLimit(req.query.limit);
      const cursor = decodeDiscussionCursor(req.query.cursor);
      const threadRootRaw =
        req.query.threadRoot != null
          ? Number(req.query.threadRoot)
          : req.query.parentId != null
            ? Number(req.query.parentId)
            : null;
      const threadRoot =
        Number.isInteger(threadRootRaw) && threadRootRaw > 0 ? threadRootRaw : null;

      const msgInclude = {
        sender: { select: { id: true, full_name: true } },
        attachments: true,
        reactions: { include: { user: { select: { id: true, full_name: true } } } },
      };

      /** Thread slice: root + replies (cursor loads older replies before the window). */
      if (threadRoot) {
        const root = await prisma.discussionMessage.findFirst({
          where: { id: threadRoot, channelId, deletedAt: null },
          include: msgInclude,
        });
        if (!root) {
          return res.json({
            results: [],
            nextCursor: null,
            hasMore: false,
            threadRoot,
          });
        }
        const whereReplies = {
          channelId,
          deletedAt: null,
          parentMessageId: threadRoot,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        };
        const replies = await prisma.discussionMessage.findMany({
          where: whereReplies,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
          include: msgInclude,
        });
        const hasMore = replies.length > limit;
        const slice = hasMore ? replies.slice(0, limit) : replies;
        const nextCursor =
          hasMore && slice.length > 0
            ? encodeDiscussionCursor(slice[slice.length - 1].createdAt, slice[slice.length - 1].id)
            : null;
        const repliesAsc = slice.slice().reverse();
        const combined = cursor ? repliesAsc : [root, ...repliesAsc];
        return res.json({
          results: mapChannelMessagesForViewer(
            enrichDiscussionMessagesAttachments(req, combined, userId),
            userId,
            channelMembership
          ),
          nextCursor,
          hasMore,
          threadRoot,
        });
      }

      const baseWhere = {
        channelId,
        deletedAt: null,
        parentMessageId: null,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      };

      const messages = await prisma.discussionMessage.findMany({
        where: baseWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        include: msgInclude,
      });

      const hasMore = messages.length > limit;
      const pageRows = hasMore ? messages.slice(0, limit) : messages;
      const nextCursor =
        hasMore && pageRows.length
          ? encodeDiscussionCursor(pageRows[pageRows.length - 1].createdAt, pageRows[pageRows.length - 1].id)
          : null;

      let resultsPayload = pageRows.slice().reverse();
      if (resultsPayload.length > 0) {
        const rootIds = resultsPayload.map((m) => m.id);
        const [countRows, recentReplies] = await Promise.all([
          prisma.discussionMessage.groupBy({
            by: ["parentMessageId"],
            where: { channelId, deletedAt: null, parentMessageId: { in: rootIds } },
            _count: { id: true },
          }),
          prisma.discussionMessage.findMany({
            where: { channelId, deletedAt: null, parentMessageId: { in: rootIds } },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 400,
            select: {
              parentMessageId: true,
              createdAt: true,
              senderId: true,
              isAnonymous: true,
              sender: { select: { id: true, full_name: true } },
            },
          }),
        ]);
        const previewByRoot = new Map();
        for (const row of countRows) {
          previewByRoot.set(row.parentMessageId, {
            replyCount: row._count.id,
            lastReplyAt: null,
            previewSenders: [],
          });
        }
        for (const r of recentReplies) {
          const pid = r.parentMessageId;
          if (pid == null) continue;
          const pr = previewByRoot.get(pid);
          if (!pr) continue;
          if (!pr.lastReplyAt) pr.lastReplyAt = r.createdAt.toISOString();
          if (pr.previewSenders.length < 3 && (r.senderId || r.isAnonymous)) {
            const sid = r.isAnonymous ? 0 : Number(r.senderId);
            const name = r.isAnonymous ? "Anonymous" : r.sender?.full_name ?? "Member";
            if (!pr.previewSenders.some((s) => s.id === sid && s.full_name === name)) {
              pr.previewSenders.push({
                id: sid,
                full_name: name,
              });
            }
          }
        }
        resultsPayload = resultsPayload.map((m) => ({
          ...m,
          threadPreview: previewByRoot.get(m.id) ?? null,
        }));
      }

      return res.json({
        results: mapChannelMessagesForViewer(
          enrichDiscussionMessagesAttachments(req, resultsPayload, userId),
          userId,
          channelMembership
        ),
        nextCursor,
        hasMore,
        threadRoot: null,
      });
    } catch (error) {
      console.error("GET /discussions/channels/:channelId/messages failed", error);
      const hint = prismaSchemaDriftHint(error);
      return res.status(500).json(apiErrorBody(`Failed to load messages.${hint}`, null));
    }
  },
);

router.post(
  "/channels/:channelId/messages",
  requireChannelPermission(PERMISSION_BITS.SEND_MESSAGES),
  async (req, res) => {
    try {
      const userId = getDiscussionCallerUserId(req);
      const channelId = req.discussionChannelId;
      const parseResult = sendChannelMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json(apiErrorBody("Invalid request body", parseResult.error.issues));
      }
      const body = parseResult.data;

      const channel = await prisma.discussionChannel.findUnique({
        where: { id: channelId },
        select: {
          id: true,
          serverId: true,
          scopeType: true,
          scopeId: true,
          slowModeSeconds: true,
          server: { select: { id: true, e2eeEnabled: true } },
        },
      });
      if (!channel) return res.status(404).json(apiErrorBody("Channel not found", null));

      const channelMembership = await prisma.discussionGroupMembership.findFirst({
        where: {
          groupId: channel.serverId,
          userId,
          leftAt: null,
          isActive: true,
        },
      });

      // Moderator-applied mute. The send-message handler is the authoritative
      // enforcement point so we don't need to extend the permission engine
      // (which would have to fetch the membership row on every check).
      if (channelMembership?.mutedUntil) {
        const until = new Date(channelMembership.mutedUntil);
        if (!Number.isNaN(until.getTime()) && until.getTime() > Date.now()) {
          return res.status(403).json(
            apiErrorBody("You are muted in this server", {
              code: "MEMBER_MUTED",
              mutedUntil: until.toISOString(),
            })
          );
        }
      }

      if (body.parentMessageId != null) {
        const parent = await prisma.discussionMessage.findFirst({
          where: {
            id: body.parentMessageId,
            channelId,
            deletedAt: null,
            parentMessageId: null,
          },
          select: { id: true },
        });
        if (!parent) {
          return res
            .status(400)
            .json(apiErrorBody("parentMessageId must be a root message in this channel", null));
        }
      }

      const isEncrypted = !!body.e2e;
      const parentMessageId = body.parentMessageId ?? null;
      const attachmentIds = body.attachmentIds ?? [];

      let effectiveContent = "";
      let messageType = "TEXT";
      let isAnonymousFlag = false;

      if (isEncrypted) {
        effectiveContent = String(body.content ?? "").trim();
        const hasTextEnc = effectiveContent.length > 0;
        messageType =
          attachmentIds.length > 0 && !hasTextEnc ? "MEDIA" : String(body.messageType || "TEXT").toUpperCase();
        isAnonymousFlag = false;
      } else {
        const derived = deriveQuestionFields({
          content: body.content ?? "",
          messageType: body.messageType,
          postAsQuestion: body.postAsQuestion,
          isAnonymous: body.isAnonymous,
          parentMessageId,
        });
        effectiveContent = derived.contentStored.trim();
        const hasTextBody = effectiveContent.length > 0;
        messageType =
          attachmentIds.length > 0 && !hasTextBody ? "MEDIA" : derived.messageType;
        isAnonymousFlag = derived.isAnonymous;
        if (messageType !== "QUESTION") isAnonymousFlag = false;
        if (messageType === "QUESTION" && !hasTextBody) {
          return res.status(400).json(apiErrorBody("Question text is required", null));
        }
      }

      const hasText = effectiveContent.length > 0;
      if (!isEncrypted && !hasText && attachmentIds.length === 0) {
        return res
          .status(400)
          .json(apiErrorBody("Either content or attachmentIds is required", null));
      }
      if (isEncrypted && !hasText && attachmentIds.length === 0) {
        return res
          .status(400)
          .json(apiErrorBody("Either content or attachmentIds is required", null));
      }
      if (attachmentIds.length > 0) {
        const pendingRows = await prisma.discussionAttachment.findMany({
          where: {
            id: { in: attachmentIds },
            uploadedById: userId,
            status: "PENDING",
            messageId: null,
            OR: [{ groupId: channel.serverId }, { groupId: null }],
          },
        });
        if (pendingRows.length !== attachmentIds.length) {
          return res
            .status(400)
            .json(apiErrorBody("Some attachments are invalid, already used, or not owned by user", null));
        }
      }

      const slowModeSec = Math.max(0, Math.floor(Number(channel.slowModeSeconds ?? 0)) || 0);
      if (slowModeSec > 0) {
        const canBypassSlow = hasPermission(
          req.discussionChannelPermissions,
          PERMISSION_BITS.MANAGE_MESSAGES,
        );
        if (!canBypassSlow) {
          const lastFromSender = await prisma.discussionMessage.findFirst({
            where: {
              channelId,
              senderId: userId,
              deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          });
          if (lastFromSender) {
            const elapsedSec = (Date.now() - lastFromSender.createdAt.getTime()) / 1000;
            if (elapsedSec < slowModeSec) {
              const retryAfterSeconds = Math.max(1, Math.ceil(slowModeSec - elapsedSec));
              return res.status(429).json({
                status: "error",
                message: `Slow mode is enabled. Try again in ${retryAfterSeconds}s.`,
                code: "SLOW_MODE",
                retryAfterSeconds,
              });
            }
          }
        }
      }

      const txResult = await prisma.$transaction(async (tx) => {
        const created = await tx.discussionMessage.create({
          data: {
            groupId: channel.serverId,
            channelId,
            senderId: userId,
            content: isEncrypted ? null : hasText ? effectiveContent : null,
            messageType,
            isAnonymous: isAnonymousFlag,
            parentMessageId: body.parentMessageId ?? null,
            keyVersion: body.e2e?.keyVersion ?? null,
            nonce: body.e2e?.nonce ?? null,
            ciphertext: body.e2e?.ciphertext ?? null,
            senderDeviceId: body.e2e?.senderDeviceId ?? null,
          },
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        });

        if (attachmentIds.length > 0) {
          await tx.discussionAttachment.updateMany({
            where: { id: { in: attachmentIds }, uploadedById: userId, messageId: null },
            data: {
              messageId: created.id,
              groupId: channel.serverId,
              status: "LINKED",
            },
          });
        }

        const allRecipientRows = await tx.discussionGroupMembership.findMany({
          where: {
            groupId: channel.serverId,
            leftAt: null,
            isActive: true,
            userId: { not: userId },
          },
          select: {
            userId: true,
            user: { select: { number: true, full_name: true } },
          },
        });
        const recipientRows = await filterMembershipRowsByChannelScope(allRecipientRows, channel);
        const memberRows = recipientRows.map((r) => ({
          userId: r.userId,
          number: r.user?.number ?? "",
          full_name: r.user?.full_name ?? "",
        }));
        const memberIdSet = new Set(memberRows.map((m) => Number(m.userId)));
        const recipientIds = recipientRows.map((r) => Number(r.userId)).filter(Boolean);
        const plaintext = isEncrypted ? "" : hasText ? effectiveContent : "";
        const handles = extractMentionHandles(plaintext);
        const mentionUserIds = new Set(
          resolveMentionUserIds(handles, memberRows, userId).filter((id) => memberIdSet.has(id))
        );
        const messageRecipients = recipientIds.filter((rid) => !mentionUserIds.has(rid));
        if (messageRecipients.length > 0) {
          await tx.discussionNotification.createMany({
            data: messageRecipients.map((uid) => ({
              userId: uid,
              groupId: channel.serverId,
              messageId: created.id,
              type: "MESSAGE",
              payload: {
                groupId: channel.serverId,
                channelId,
                messageId: created.id,
                senderId: userId,
                senderName: anonymousSafeSenderName({
                  isAnonymous: isAnonymousFlag,
                  sender: created.sender,
                }),
              },
            })),
          });
        }
        if (mentionUserIds.size > 0) {
          await tx.discussionNotification.createMany({
            data: [...mentionUserIds].map((recipientId) => ({
              userId: recipientId,
              groupId: channel.serverId,
              messageId: created.id,
              type: "MENTION",
              payload: {
                groupId: channel.serverId,
                channelId,
                messageId: created.id,
                senderId: userId,
                senderName: anonymousSafeSenderName({
                  isAnonymous: isAnonymousFlag,
                  sender: created.sender,
                }),
              },
            })),
          });
        }

        const senderName = anonymousSafeSenderName({
          isAnonymous: isAnonymousFlag,
          sender: created.sender,
        });
        const notificationEvents = [
          ...messageRecipients.map((uid) => ({
            userId: uid,
            notification: {
              type: "MESSAGE",
              groupId: channel.serverId,
              channelId,
              messageId: created.id,
              senderId: userId,
              senderName,
            },
          })),
          ...[...mentionUserIds].map((uid) => ({
            userId: uid,
            notification: {
              type: "MENTION",
              groupId: channel.serverId,
              channelId,
              messageId: created.id,
              senderId: userId,
              senderName,
            },
          })),
        ];

        const saved = await tx.discussionMessage.findUnique({
          where: { id: created.id },
          include: {
            sender: { select: { id: true, full_name: true } },
            attachments: true,
          },
        });
        return { message: saved, notificationEvents };
      });

      const message = txResult?.message;
      const notificationEvents = txResult?.notificationEvents ?? [];

      if (!message) {
        return res.status(500).json(apiErrorBody("Failed to create message", null));
      }

      const rawOut = enrichDiscussionMessagesAttachments(
        req,
        [{ ...message, channelId, serverId: channel.serverId }],
        userId
      )[0];
      const outPayload = applyAnonymousSenderPolicy(rawOut, userId, channelMembership);
      const wsPayload = rawOut.isAnonymous
        ? applyAnonymousSenderPolicy(rawOut, null, null, { broadcast: true })
        : rawOut;
      try {
        const io = getIo();
        if (io) {
          io.to(`channel:${channelId}`).emit("message:new", wsPayload);
          io.to(`channel:${channelId}`).emit("discussion:message:new", wsPayload);
        }
      } catch (emitErr) {
        console.warn("Socket emit failed for channel message:new", emitErr?.message);
      }

      try {
        await emitDiscussionNotificationEvents(notificationEvents);
      } catch (emitErr) {
        console.warn("Socket emit failed for channel notifications", emitErr?.message);
      }

      return res.status(201).json({ message: outPayload });
    } catch (error) {
      console.error("POST /discussions/channels/:channelId/messages failed", error);
      return res.status(500).json(apiErrorBody("Failed to send message", null));
    }
  },
);

export default router;
