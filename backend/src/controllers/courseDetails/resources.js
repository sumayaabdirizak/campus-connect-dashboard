import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

const RESOURCE_UPLOAD_DIR = './uploads/resources';
const RESOURCE_FILE_LIMIT = 100 * 1024 * 1024; // 100 MB — books / slide decks can be hefty.
const ALLOWED_MIME_PREFIXES = ['application/', 'image/', 'text/', 'video/'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(RESOURCE_UPLOAD_DIR)) {
      fs.mkdirSync(RESOURCE_UPLOAD_DIR, { recursive: true });
    }
    cb(null, RESOURCE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: RESOURCE_FILE_LIMIT },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p))) return cb(null, true);
    cb(new Error('Unsupported file type'));
  },
});

const teacherInclude = { teacher: { select: { id: true, full_name: true } } };

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: literal-segment routes MUST be declared before parameterised ones
// so Express doesn't match e.g. POST /reorder against POST /:courseOfferingId.
// ─────────────────────────────────────────────────────────────────────────────

/// Bulk resource reorder. Body: `{ items: [{id, moduleId, position}] }`. All
/// updates run in a single Prisma transaction so the list never appears
/// half-shuffled to concurrent readers.
router.post('/reorder', auth, asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) return res.json({ updated: 0 });
  await prisma.$transaction(
    items.map((it) =>
      prisma.resource.update({
        where: { id: Number(it.id) },
        data: {
          moduleId: it.moduleId == null ? null : Number(it.moduleId),
          position: Number(it.position) || 0,
        },
      })
    )
  );
  res.json({ updated: items.length });
}));

router.post(
  '/upload',
  auth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const hostBase = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      url: `${hostBase}/uploads/resources/${req.file.filename}`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  })
);

/// Bulk module reorder. Body: `{ items: [{id, position}] }`.
router.post('/modules/reorder', auth, asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) return res.json({ updated: 0 });
  await prisma.$transaction(
    items.map((it) =>
      prisma.courseModule.update({
        where: { id: Number(it.id) },
        data: { position: Number(it.position) || 0 },
      })
    )
  );
  res.json({ updated: items.length });
}));

router.patch('/modules/:moduleId', auth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.moduleId, 10);
  const { title, description, publishedAt, position } = req.body ?? {};
  const m = await prisma.courseModule.update({
    where: { id },
    data: {
      ...(typeof title === 'string' && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(publishedAt !== undefined && {
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      }),
      ...(Number.isInteger(position) && { position }),
    },
  });
  res.json(m);
}));

router.delete('/modules/:moduleId', auth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.moduleId, 10);
  // Resources with this moduleId have onDelete: SetNull, so they move to the
  // "Ungrouped" bucket instead of being deleted.
  await prisma.courseModule.delete({ where: { id } });
  res.json({ success: true });
}));

// ─── Per-offering resource list ──────────────────────────────────────────────

/// List the resources for an offering. New rows are matched by
/// `courseOfferingId`; legacy rows (created before the schema migration that
/// added the offering scope) are matched by the old `courseId === offeringId`
/// quirk so nothing disappears for existing data.
router.get('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.courseOfferingId, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });

  const resources = await prisma.resource.findMany({
    where: {
      OR: [
        { courseOfferingId: id },
        { courseOfferingId: null, courseId: id }
      ]
    },
    include: teacherInclude,
    orderBy: [{ moduleId: 'asc' }, { position: 'asc' }, { created_at: 'desc' }],
  });

  res.json(resources);
}));

router.post('/:courseOfferingId', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  const { title, type, url, description, originalName, mimeType, moduleId } = req.body;
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
    include: teacherInclude,
  });
  res.json(resource);
}));

router.patch('/:resourceId', auth, asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { title, type, url, description, is_draft, status, moduleId, position } = req.body;

  const resource = await prisma.resource.update({
    where: { id: parseInt(resourceId) },
    data: {
      ...(title && { title }),
      ...(type && { type }),
      ...(url && { url }),
      ...(description !== undefined && { description }),
      ...(typeof is_draft === 'boolean' && { is_draft }),
      ...(status && { status }),
      ...(moduleId !== undefined && { moduleId: moduleId === null ? null : Number(moduleId) }),
      ...(Number.isInteger(position) && { position }),
    },
    include: teacherInclude,
  });
  res.json(resource);
}));

router.delete('/:resourceId', auth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.resourceId);
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (existing) {
    try {
      const filename = existing.url.split('/').pop();
      if (filename && existing.originalName) {
        const filepath = path.join(RESOURCE_UPLOAD_DIR, filename);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      }
    } catch { /* ignore */ }
  }
  await prisma.resource.delete({ where: { id } });
  res.json({ success: true });
}));

router.get(
  '/:resourceId/download',
  auth,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.resourceId, 10);
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) return res.status(404).json({ message: 'Not found' });

    const filename = resource.url.split('/').pop();
    if (!filename) return res.status(404).json({ message: 'Not a downloadable resource' });

    const filepath = path.join(RESOURCE_UPLOAD_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'File missing on disk' });
    }
    res.download(filepath, resource.originalName ?? filename);
  })
);

// ─── Course Modules ──────────────────────────────────────────────────────────

router.get('/:courseOfferingId/modules', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  const modules = await prisma.courseModule.findMany({
    where: { courseOfferingId },
    orderBy: [{ position: 'asc' }, { created_at: 'asc' }],
  });
  res.json(modules);
}));

router.post('/:courseOfferingId/modules', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  const { title, description, publishedAt } = req.body ?? {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: 'title is required' });
  }
  const last = await prisma.courseModule.findFirst({
    where: { courseOfferingId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const m = await prisma.courseModule.create({
    data: {
      courseOfferingId,
      title: String(title).trim(),
      description: description ?? null,
      position: (last?.position ?? -1) + 1,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    },
  });
  res.status(201).json(m);
}));

export default router;
