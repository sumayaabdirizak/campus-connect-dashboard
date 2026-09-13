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
import { assertActiveResourceType } from '../../../services/resources/resourceTypeOptions.js';
import { notifyResourcePublished } from './notifyStudents.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post('/:courseOfferingId', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const offeringPublicId = req.courseOffering.publicId;
    const { title, type, url, description, originalName, mimeType, moduleId } = req.body;
    // Block `javascript:`, `data:`, `vbscript:`, etc. before the URL ever
    // reaches the DB — every student would render this as `<a href={url}>`.
    assertSafeExternalUrl(url, 'url');
    const typeOk = await assertActiveResourceType(type);
    if (!typeOk.ok) return res.status(400).json({ message: typeOk.message });
    const teacherId = req.user.id;
  
    // Look up the underlying Course so the legacy courseId column stays
    // populated (keeps the FK satisfied for the old indexes / queries).
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      select: { courseId: true },
    });
    if (!offering) return res.status(404).json({ message: 'Course offering not found' });
  
    // Append at the end of the target module by default.
    const last = await prisma.resource.findFirst({
      where: { courseOfferingId, moduleId: moduleId ?? null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (last?.position ?? -1) + 1;
  
    const resource = await prisma.resource.create({
      data: {
        title,
        type,
        url,
        description,
        originalName: originalName ?? null,
        mimeType: mimeType ?? null,
        status: 'APPROVED',
        courseId: offering.courseId,
        courseOfferingId,
        moduleId: Number.isInteger(moduleId) ? moduleId : null,
        position,
        teacherId,
      },
      include: { teacher: { select: { id: true, full_name: true } } },
    });
    if (resource.status === 'APPROVED') {
      notifyResourcePublished(resource, offeringPublicId);
    }
    res.json(resource);
  }));
}
