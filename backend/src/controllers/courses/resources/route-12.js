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
  router.get('/:resourceId/analytics', requireResourceManage(), asyncHandler(async (req, res) => {
    const resourceId = parseInt(req.params.resourceId, 10);
    const offeringId = req.resourceRecord?.courseOfferingId ?? req.courseOffering?.id;
  
    // Roster: enrolled students in the offering's section.
    const offering = offeringId
      ? await prisma.courseOffering.findUnique({
          where: { id: offeringId },
          select: {
            section: {
              select: {
                studentRegistrations: {
                  select: {
                    student: { select: { id: true, full_name: true, number: true } },
                  },
                  orderBy: { student: { full_name: 'asc' } },
                },
              },
            },
          },
        })
      : null;
  
    const students = (offering?.section?.studentRegistrations ?? []).map((r) => r.student);
  
    const views = await prisma.resourceView.findMany({
      where: { resourceId },
      select: {
        studentId: true,
        watchedSeconds: true,
        durationSeconds: true,
        completed: true,
        viewCount: true,
        updated_at: true,
      },
    });
    const viewByStudent = new Map(views.map((v) => [v.studentId, v]));
  
    const pct = (watched, duration) =>
      duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : 0;
  
    const rows = students.map((s) => {
      const v = viewByStudent.get(s.id);
      return {
        studentId: s.id,
        fullName: s.full_name,
        number: s.number,
        watchedSeconds: v?.watchedSeconds ?? 0,
        durationSeconds: v?.durationSeconds ?? 0,
        percent: v ? pct(v.watchedSeconds, v.durationSeconds) : 0,
        completed: v?.completed ?? false,
        viewCount: v?.viewCount ?? 0,
        lastViewedAt: v?.updated_at ?? null,
        started: !!v && (v.watchedSeconds ?? 0) > 0,
      };
    });
  
    const startedRows = rows.filter((r) => r.started);
    const completedCount = rows.filter((r) => r.completed).length;
    const avgPercent = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + r.percent, 0) / rows.length)
      : 0;
  
    res.json({
      summary: {
        totalStudents: rows.length,
        viewers: startedRows.length,
        completedCount,
        avgPercent,
      },
      rows,
    });
  }));
}
