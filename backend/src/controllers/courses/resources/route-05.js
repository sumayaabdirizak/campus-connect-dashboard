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
  router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
    const id = req.courseOffering.id;
  
    const resources = await prisma.resource.findMany({
      where: {
        OR: [
          { courseOfferingId: id },
          { courseOfferingId: null, courseId: id }
        ]
      },
      include: { teacher: { select: { id: true, full_name: true } } },
      orderBy: [{ moduleId: 'asc' }, { position: 'asc' }, { created_at: 'desc' }],
    });

    // Aggregate watch counts in one query rather than N+1 per resource.
    const resourceIds = resources.map((r) => r.id);
    const viewAgg = resourceIds.length
      ? await prisma.resourceView.groupBy({
          by: ['resourceId'],
          where: { resourceId: { in: resourceIds } },
          _sum: { viewCount: true },
          _count: { _all: true },
        })
      : [];
    const aggByResource = new Map(
      viewAgg.map((v) => [v.resourceId, { watchCount: v._sum.viewCount ?? 0, viewerCount: v._count._all }])
    );

    res.json(
      resources.map((r) => ({
        ...r,
        watchCount: aggByResource.get(r.id)?.watchCount ?? 0,
        viewerCount: aggByResource.get(r.id)?.viewerCount ?? 0,
      }))
    );
  }));
}
