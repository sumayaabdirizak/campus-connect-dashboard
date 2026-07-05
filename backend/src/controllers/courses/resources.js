import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireResourceManage,
  requireResourceRead,
  requireModuleManage,
  requireResourceReorderManage,
  requireModuleReorderManage,
} from "../../middleware/courseOfferingRbac.js";
import { assertSafeExternalUrl } from "../../utils/safeUrl.js";

const router = Router();

const RESOURCE_UPLOAD_DIR = './uploads/resources';
const RESOURCE_FILE_LIMIT = 100 * 1024 * 1024; // 100 MB — books / slide decks can be hefty.

/**
 * Tight extension allowlist — replaces the previous "application/*, image/*,
 * text/*, video/*" MIME-prefix match which trusted the client-supplied
 * Content-Type and let an attacker upload `.html` as `application/pdf`,
 * yielding stored XSS once a victim opened the resulting URL. We key on the
 * file EXTENSION (which we normalise via diskStorage's filename), backed by
 * a content-sniff via `file-type` after the file lands on disk.
 *
 * Notes:
 *   - `.html`, `.htm`, `.js`, `.exe`, `.bat`, `.sh`, `.php`, `.jsp`, `.asp`
 *     are NEVER permitted regardless of MIME claim.
 *   - `.svg` is allowed only because /uploads is served with
 *     Content-Disposition: attachment, so the browser downloads rather
 *     than rendering inline — neutralising the `<script>`-in-SVG XSS vector.
 *     Drop it from this set if that header ever changes.
 *   - `.zip` and `.epub` are allowed (epub IS a zip). `.rar`, `.7z` are
 *     excluded — format-specific exploits / harder to scan reliably.
 */
export const ALLOWED_EXTENSIONS = new Set([
  // Documents
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.txt', '.md', '.epub',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  // Audio
  '.mp3', '.wav', '.m4a', '.ogg', '.webm',
  // Video
  '.mp4', '.mov', '.webm', '.mkv',
  // Archives
  '.zip',
]);

/**
 * Maps sniffed MIME types from `file-type` to a coarse "family". After we
 * read the file we run `fileTypeFromBuffer` over the first 4100 bytes and
 * compare its family to the family the extension declares. A mismatch
 * means the upload is lying about what it is (e.g. `.pdf` extension but
 * sniffed as `text/html`) and we reject + unlink.
 *
 * `file-type` returns MIME strings like 'application/pdf', 'image/png',
 * 'video/mp4', 'audio/mpeg', 'application/zip' — keys here exactly mirror
 * what the library can emit. Extensions absent from EXTENSION_FAMILY (e.g.
 * `.txt`, `.md`, `.svg`) have no reliable magic bytes; we accept them on
 * the strength of the extension allowlist alone.
 */
const SNIFF_FAMILY_BY_MIME_PREFIX = [
  { prefix: 'application/pdf', family: 'pdf' },
  { prefix: 'image/', family: 'image' },
  { prefix: 'video/', family: 'video' },
  { prefix: 'audio/', family: 'audio' },
  // OOXML / ODF and plain zip — all sniff as application/zip or one of the
  // office MIME types (file-type 19 returns the specific one). We collapse
  // them all into "zip" since they're structurally the same and any zip
  // can wear any of the extensions.
  { prefix: 'application/zip', family: 'zip' },
  { prefix: 'application/vnd.openxmlformats', family: 'zip' },
  { prefix: 'application/vnd.ms-', family: 'zip' },
  { prefix: 'application/epub', family: 'zip' },
  { prefix: 'application/msword', family: 'doc-legacy' },
];

const EXTENSION_FAMILY = {
  '.pdf': 'pdf',
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
  '.gif': 'image', '.webp': 'image',
  '.mp4': 'video', '.mov': 'video', '.mkv': 'video',
  '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio', '.ogg': 'audio',
  // .webm is ambiguous (video vs audio container) — accept either family.
  '.webm': 'media',
  '.zip': 'zip', '.docx': 'zip', '.xlsx': 'zip', '.pptx': 'zip', '.epub': 'zip',
  // Legacy office binaries sniff as application/x-cfb or application/msword.
  '.doc': 'doc-legacy', '.xls': 'doc-legacy', '.ppt': 'doc-legacy',
};

/**
 * Extensions with no useful magic bytes — we fall back to the extension
 * allowlist for these. `file-type` returns `undefined` for plain text,
 * markdown, and SVG (XML without a binary header), so we have to accept
 * an undefined sniff result for these.
 */
const NO_SNIFF_EXTENSIONS = new Set(['.txt', '.md', '.svg']);

/**
 * Verify that the file's actual content (sniffed from the first 4100 bytes
 * via `file-type`) belongs to the same family as the declared extension.
 * Returns `{ ok: true }` on accept, `{ ok: false, reason }` on reject.
 */
async function verifyContentMatchesExtension(filePath, ext) {
  // Plain-text formats have no magic bytes — extension allowlist alone.
  if (NO_SNIFF_EXTENSIONS.has(ext)) return { ok: true };

  let head;
  try {
    const fd = fs.openSync(filePath, 'r');
    head = Buffer.alloc(4100);
    const bytesRead = fs.readSync(fd, head, 0, 4100, 0);
    fs.closeSync(fd);
    if (bytesRead < 4100) head = head.subarray(0, bytesRead);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  let sniffed;
  try {
    sniffed = await fileTypeFromBuffer(head);
  } catch {
    sniffed = undefined;
  }

  const expectedFamily = EXTENSION_FAMILY[ext];
  // No mapping for this extension → trust the allowlist (e.g. exotic but
  // approved formats we didn't bother to family-map).
  if (!expectedFamily) return { ok: true };

  if (!sniffed) {
    // file-type returned nothing but the extension is in the family map
    // (so we expected magic bytes). Treat as mismatch — the file is
    // probably a renamed text/script payload.
    return { ok: false, reason: 'no magic bytes' };
  }

  const sniffedFamily = SNIFF_FAMILY_BY_MIME_PREFIX.find((m) =>
    sniffed.mime.startsWith(m.prefix),
  )?.family;

  if (!sniffedFamily) return { ok: false, reason: `unrecognised mime ${sniffed.mime}` };

  // .webm wraps either an audio or video stream — accept both.
  if (expectedFamily === 'media') {
    if (sniffedFamily === 'audio' || sniffedFamily === 'video') return { ok: true };
    return { ok: false, reason: `webm mismatch (${sniffed.mime})` };
  }
  // .doc/.xls/.ppt sniff as application/x-cfb in file-type, which we don't
  // have in the prefix table — accept any application/* match for these.
  if (expectedFamily === 'doc-legacy') {
    if (sniffed.mime.startsWith('application/')) return { ok: true };
    return { ok: false, reason: `office-legacy mismatch (${sniffed.mime})` };
  }
  if (sniffedFamily !== expectedFamily) {
    return { ok: false, reason: `${ext} declared but content sniffed as ${sniffed.mime}` };
  }
  return { ok: true };
}

/**
 * Shared multer fileFilter — only the extension allowlist runs here
 * (multer can't read the body yet). The deep content check happens in
 * the post-upload handler.
 */
export function uploadExtensionFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`File type not allowed: ${ext || '(no extension)'}`));
  }
  return cb(null, true);
}

/**
 * Shared post-upload sweep. Iterates the uploaded files, runs the
 * sniff-vs-extension check on each, and unlinks any that fail. Returns
 * either `{ ok: true }` or `{ ok: false, reason }` (in which case ALL
 * uploaded files have been deleted — partial saves would leak storage
 * and confuse the DB-write step that follows).
 */
export async function enforceUploadContentSafety(files) {
  for (const f of files) {
    const ext = path.extname(f.filename).toLowerCase();
    const verdict = await verifyContentMatchesExtension(f.path, ext);
    if (!verdict.ok) {
      for (const g of files) {
        try { fs.unlinkSync(g.path); } catch { /* swallow */ }
      }
      return { ok: false, reason: verdict.reason };
    }
  }
  return { ok: true };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(RESOURCE_UPLOAD_DIR)) {
      fs.mkdirSync(RESOURCE_UPLOAD_DIR, { recursive: true });
    }
    cb(null, RESOURCE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Filename is fully server-generated from a CSPRNG — never trust the
    // user's `originalname` for the stored filename (it can contain path
    // traversal, leading dots, or unicode bidi tricks). We preserve only
    // the extension after lowercasing for the content-family check below.
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: RESOURCE_FILE_LIMIT },
  fileFilter: uploadExtensionFilter,
});

const teacherInclude = { teacher: { select: { id: true, full_name: true } } };

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: literal-segment routes MUST be declared before parameterised ones
// so Express doesn't match e.g. POST /reorder against POST /:courseOfferingId.
// ─────────────────────────────────────────────────────────────────────────────

/// Bulk resource reorder. Body: `{ items: [{id, moduleId, position}] }`. All
/// updates run in a single Prisma transaction so the list never appears
/// half-shuffled to concurrent readers. The middleware sniffs the FIRST
/// item to derive the offering and runs the manage check; this assumes
/// every item in the request belongs to the same offering (which the
/// frontend never violates — drag-and-drop reorder is scoped to one tab).
router.post('/reorder', requireResourceReorderManage(), asyncHandler(async (req, res) => {
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
  '/upload', upload.single('file'),
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
    res.status(201).json({
      url: `${hostBase}/uploads/resources/${req.file.filename}`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  })
);

/// Bulk module reorder. Body: `{ items: [{id, position}] }`. Same caveat
/// as `/reorder` above — middleware sniffs the first item and assumes the
/// whole batch belongs to one offering.
router.post('/modules/reorder', requireModuleReorderManage(), asyncHandler(async (req, res) => {
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

router.patch('/modules/:moduleId', requireModuleManage(), asyncHandler(async (req, res) => {
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

router.delete('/modules/:moduleId', requireModuleManage(), asyncHandler(async (req, res) => {
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
router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const id = req.courseOffering.id;

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

router.post('/:courseOfferingId', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const courseOfferingId = req.courseOffering.id;
  const { title, type, url, description, originalName, mimeType, moduleId } = req.body;
  // Block `javascript:`, `data:`, `vbscript:`, etc. before the URL ever
  // reaches the DB — every student would render this as `<a href={url}>`.
  assertSafeExternalUrl(url, 'url');
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

router.patch('/:resourceId', requireResourceManage(), asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { title, type, url, description, is_draft, status, moduleId, position } = req.body;
  // Validate URL only when the field is actually being changed — PATCHes
  // that don't touch `url` should keep working.
  if (url !== undefined && url !== null) {
    assertSafeExternalUrl(url, 'url');
  }

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

router.delete('/:resourceId', requireResourceManage(), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.resourceId);
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Resource not found' });
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
  '/:resourceId/download', // Authorize against the owning offering — without this, any logged-in user
  // could stream/download any file by guessing its numeric id (IDOR). This is
  // also the streaming source for uploaded video/audio, so it's a hot path.
  requireResourceRead(),
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

// ─── Watch tracking (video / audio analytics) ────────────────────────────────

/// Completion threshold — once a student has accumulated this fraction of the
/// media's duration in actual playback time, we mark the view "completed".
const COMPLETION_RATIO = 0.9;

/// Max seconds we trust per heartbeat. The client sends the playback delta
/// since its last beat; we clamp it so a tab left open / clock skew / a
/// malicious client can't inflate watch time. Beats fire ~every 15s, so 60
/// leaves generous headroom for a missed beat without letting a single beat
/// claim minutes of watching.
const MAX_DELTA_PER_BEAT = 60;

/// Student heartbeat — records incremental watch progress for a video/audio
/// resource. Body: `{ watchedDelta, position, duration, started }`.
///   - `watchedDelta`  seconds of real playback since the previous beat
///   - `position`      current playback position (for resume)
///   - `duration`      media length in seconds (reported by the player)
///   - `started`       true on a fresh play from ~0 → bumps viewCount
/// Teachers previewing their own media don't pollute analytics — we no-op
/// for any non-student caller.
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

/// The calling student's own progress for a resource — lets the player resume
/// from `lastPositionSeconds`. Returns null when nothing's been watched yet.
router.get('/:resourceId/my-progress', requireResourceRead(), asyncHandler(async (req, res) => {
  if (req.user?.role !== 'STUDENT') return res.json(null);
  const resourceId = parseInt(req.params.resourceId, 10);
  const studentId = req.user.id;
  const view = await prisma.resourceView.findUnique({
    where: { resourceId_studentId: { resourceId, studentId } },
    select: {
      watchedSeconds: true,
      durationSeconds: true,
      lastPositionSeconds: true,
      completed: true,
    },
  });
  res.json(view ?? null);
}));

/// Teacher analytics for a single video/audio resource. Returns one row per
/// enrolled student (including non-watchers) plus a summary block. Watch
/// percent is derived from accumulated playback over media duration.
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

// ─── Course Modules ──────────────────────────────────────────────────────────

router.get('/:courseOfferingId/modules', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const courseOfferingId = req.courseOffering.id;
  const modules = await prisma.courseModule.findMany({
    where: { courseOfferingId },
    orderBy: [{ position: 'asc' }, { created_at: 'asc' }],
  });
  res.json(modules);
}));

router.post('/:courseOfferingId/modules', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const courseOfferingId = req.courseOffering.id;
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
