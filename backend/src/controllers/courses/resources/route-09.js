import path from 'path';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { requireResourceRead } from '../../../middleware/courseOfferingRbac.js';
import { sendStoredFile } from '../../../storage/objectStorage.js';
import { resourceKeyFromUrl, RESOURCE_STORAGE_PREFIX } from './helpers.js';

function isPlayableMedia(mimeType) {
  const mime = String(mimeType || '');
  return /^video\//i.test(mime) || /^audio\//i.test(mime);
}

/** @param {import('express').Router} router */
export function register(router) {
  router.get(
    '/:resourceId/download',
    // Authorize against the owning offering — without this, any logged-in user
    // could stream/download any file by guessing its numeric id (IDOR). This is
    // also the streaming source for uploaded video/audio, so it's a hot path.
    requireResourceRead(),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.resourceId, 10);
      const resource = await prisma.resource.findUnique({ where: { id } });
      if (!resource) return res.status(404).json({ message: 'Not found' });

      const key = resourceKeyFromUrl(resource.url);
      if (!key) return res.status(404).json({ message: 'Not a downloadable resource' });

      const downloadName = resource.originalName ?? path.basename(key);
      // Players need inline streaming; `?download=1` forces attachment save.
      const forceDownload = req.query.download === '1';
      const inline = isPlayableMedia(resource.mimeType) && !forceDownload;

      return sendStoredFile(res, key, {
        legacyPrefix: RESOURCE_STORAGE_PREFIX,
        downloadName: inline ? null : downloadName,
        contentType: resource.mimeType || undefined,
        inline,
      });
    })
  );
}
