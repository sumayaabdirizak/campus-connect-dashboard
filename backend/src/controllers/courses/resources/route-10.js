import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireResourceManage,
  requireResourceRead,
  requireModuleManage,
  requireResourceReorderManage,
  requireModuleReorderManage,
} from "../../../middleware/courseOfferingRbac.js";
import { assertSafeExternalUrl } from "../../../utils/safeUrl.js";
import { uploadRateLimit } from "../../../middleware/perUserRateLimit.js";
import {
  commitUploadedFile,
  deleteStoredObject,
  sendStoredFile,
  normalizeStorageKey,
} from "../../../storage/objectStorage.js";

import { resourceKeyFromUrl, verifyContentMatchesExtension, uploadExtensionFilter, enforceUploadContentSafety } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:resourceId/progress', requireResourceRead(), asyncHandler(async (req, res) => {
    if (req.user?.role !== 'STUDENT') {
      return res.json({ skipped: true });
    }
    const resourceId = parseInt(req.params.resourceId, 10);
    const studentId = req.user.id;
  
    const rawDelta = Number(req.body?.watchedDelta) || 0;
    const delta = Math.max(0, Math.min(MAX_DELTA_PER_BEAT, Math.round(rawDelta)));
    const position = Math.max(0, Math.round(Number(req.body?.position) || 0));
    const duration = Math.max(0, Math.round(Number(req.body?.duration) || 0));
    const started = req.body?.started === true;
    // The player sets this on the media `ended` event — a direct "watched to the
    // end" completion signal, independent of the accumulated-watch threshold.
    const ended = req.body?.ended === true;
  
    const existing = await prisma.resourceView.findUnique({
      where: { resourceId_studentId: { resourceId, studentId } },
      select: { watchedSeconds: true, durationSeconds: true, viewCount: true, completed: true },
    });
  
    const nextWatched = (existing?.watchedSeconds ?? 0) + delta;
    // Keep the largest duration we've seen (player reports 0 until metadata loads).
    // NOTE: `duration` is client-reported and only grows, so a tampered client
    // could send a tiny first value to mark itself "completed" cheaply. The
    // watched delta is clamped, but duration is not authoritative — probe it with
    // ffprobe at upload time and store it on the resource if completion ever needs
    // to be tamper-proof.
    const nextDuration = Math.max(existing?.durationSeconds ?? 0, duration);
    // Completed once they've either accumulated 90% of real playback OR played
    // through to the media's end. Sticky — never flips back to false once true.
    const reachedThreshold = nextDuration > 0 && nextWatched >= nextDuration * COMPLETION_RATIO;
    const completed = (existing?.completed ?? false) || ended || reachedThreshold;
    const nextViewCount = (existing?.viewCount ?? 0) + (started ? 1 : 0);
  
    const view = await prisma.resourceView.upsert({
      where: { resourceId_studentId: { resourceId, studentId } },
      create: {
        resourceId,
        studentId,
        watchedSeconds: delta,
        durationSeconds: nextDuration,
        lastPositionSeconds: position,
        completed,
        viewCount: 1, // first beat always counts as the first session
      },
      update: {
        watchedSeconds: nextWatched,
        durationSeconds: nextDuration,
        lastPositionSeconds: position,
        completed,
        viewCount: nextViewCount === 0 ? 1 : nextViewCount,
      },
      select: {
        watchedSeconds: true,
        durationSeconds: true,
        lastPositionSeconds: true,
        completed: true,
      },
    });
  
    res.json(view);
  }));
}
