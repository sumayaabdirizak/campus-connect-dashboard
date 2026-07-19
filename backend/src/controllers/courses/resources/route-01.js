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

import { resourceKeyFromUrl, verifyContentMatchesExtension, uploadExtensionFilter, enforceUploadContentSafety, upload, RESOURCE_STORAGE_PREFIX } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/upload', uploadRateLimit, upload.single('file'),
    asyncHandler(async (req, res) => {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  
      // Content-sniff verification — the extension allowlist in multer's
      // fileFilter only checks the user-supplied filename; a malicious upload
      // could rename `.html` to `.pdf` and pass that gate. After multer has
      // written the file to disk we read its first 4100 bytes, run
      // `file-type.fileTypeFromBuffer`, and confirm the sniffed MIME family
      // matches the declared extension. On mismatch we delete the file and
      // return 400 BEFORE responding with the URL — so no orphaned malicious
      // payload remains on disk.
      const verdict = await enforceUploadContentSafety([req.file]);
      if (!verdict.ok) {
        return res.status(400).json({
          message: 'File contents do not match the declared type. Upload rejected.',
        });
      }
  
      const hostBase = `${req.protocol}://${req.get('host')}`;
      let committed;
      try {
        committed = await commitUploadedFile({
          prefix: RESOURCE_STORAGE_PREFIX,
          filename: req.file.filename,
          localPath: req.file.path,
          contentType: req.file.mimetype,
          hostBase,
        });
      } catch (err) {
        try {
          fs.unlinkSync(req.file.path);
        } catch { /* ignore */ }
        console.error('resource upload storage commit failed', err);
        return res.status(500).json({ message: 'Failed to store file' });
      }
  
      res.status(201).json({
        url: committed.url,
        storageKey: committed.storageKey,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
    })
  );
}
