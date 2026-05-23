import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireAssignmentManage,
  requireAssignmentSubmissionsRead,
  requireStudentSubmission,
  requireSubmissionGrade,
} from "../../middleware/courseOfferingRbac.js";
import { pushToUser, pushToUsers } from "../../services/pushNotifier.service.js";
import { suggestGradeForSubmission } from "../../services/aiGradingAssist.service.js";

const router = Router();

const ASSIGNMENT_UPLOAD_DIR = './uploads/assignments';
const ASSIGNMENT_FILE_LIMIT = 25 * 1024 * 1024; // 25 MB — matches discussions "FILE" cap.
const assignmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(ASSIGNMENT_UPLOAD_DIR)) {
      fs.mkdirSync(ASSIGNMENT_UPLOAD_DIR, { recursive: true });
    }
    cb(null, ASSIGNMENT_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const assignmentUpload = multer({
  storage: assignmentStorage,
  limits: { fileSize: ASSIGNMENT_FILE_LIMIT },
});

const attachmentInclude = {
  attachments: {
    orderBy: { created_at: 'asc' },
    include: { uploadedBy: { select: { id: true, full_name: true } } },
  },
};

router.get('/:courseOfferingId', auth, requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;

  const assignments = await prisma.assignment.findMany({
    where: { courseOfferingId: parseInt(courseOfferingId, 10) },
    include: {
      submissions: { select: { id: true, studentId: true, grade: true, is_reviewed: true } },
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
    orderBy: { due_date: 'asc' },
  });

  res.json(assignments);
}));

function normaliseModes({ workMode, gradingScope }) {
  const valid = (v) => v === 'INDIVIDUAL' || v === 'GROUP';
  const wm = valid(workMode) ? workMode : null;
  const gs = valid(gradingScope) ? gradingScope : null;
  // Reject the impossible combo (solo work, shared grade).
  if (wm === 'INDIVIDUAL' && gs === 'GROUP') {
    return { error: 'workMode=INDIVIDUAL is incompatible with gradingScope=GROUP' };
  }
  return { data: { ...(wm && { workMode: wm }), ...(gs && { gradingScope: gs }) } };
}

router.post('/:courseOfferingId', auth, requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { title, description, open_at, due_date, is_draft, workMode, gradingScope, lateWindowMinutes } = req.body;
  const modes = normaliseModes({ workMode, gradingScope });
  if (modes.error) return res.status(400).json({ message: modes.error });

  const openAtDate = open_at ? new Date(open_at) : null;
  const dueDateObj = due_date ? new Date(due_date) : new Date();
  if (openAtDate && openAtDate > dueDateObj) {
    return res.status(400).json({ message: 'open_at must be before due_date' });
  }

  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      open_at: openAtDate,
      due_date: dueDateObj,
      is_draft: Boolean(is_draft),
      courseOfferingId: parseInt(courseOfferingId, 10),
      ...modes.data,
      ...(Number.isInteger(lateWindowMinutes) ? { lateWindowMinutes } : {}),
    },
    include: {
      submissions: true,
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
  });

  res.json(assignment);
}));

router.patch('/:assignmentId', auth, requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { title, description, open_at, due_date, is_draft, workMode, gradingScope, lateWindowMinutes } = req.body;
  const modes = normaliseModes({ workMode, gradingScope });
  if (modes.error) return res.status(400).json({ message: modes.error });

  const assignment = await prisma.assignment.update({
    where: { id: parseInt(assignmentId, 10) },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(open_at !== undefined && { open_at: open_at ? new Date(open_at) : null }),
      ...(due_date && { due_date: new Date(due_date) }),
      ...(is_draft !== undefined && { is_draft: Boolean(is_draft) }),
      ...modes.data,
      ...(Number.isInteger(lateWindowMinutes) && { lateWindowMinutes }),
    },
    include: {
      submissions: true,
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
  });

  res.json(assignment);
}));

router.delete('/:assignmentId', auth, requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  await prisma.submission.deleteMany({ where: { assignmentId: parseInt(assignmentId, 10) } });
  await prisma.assignment.delete({ where: { id: parseInt(assignmentId, 10) } });

  res.json({ success: true });
}));

/// Upload one or more files and attach them to an assignment. `field` is "files"
/// (array). Stores to /uploads/assignments and persists rows to
/// AssignmentAttachment so they're returned with the assignment payload.
router.post(
  '/:assignmentId/attachments',
  auth,
  requireAssignmentManage(),
  assignmentUpload.array('files', 10),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const files = req.files ?? [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true },
    });
    if (!assignment) {
      // Best-effort cleanup of orphan files.
      for (const f of files) try { fs.unlinkSync(f.path); } catch {}
      return res.status(404).json({ message: 'Assignment not found' });
    }
    const uploadedById = req.user.id ?? req.user.sub;
    const hostBase = `${req.protocol}://${req.get('host')}`;

    const created = await prisma.$transaction(
      files.map((f) =>
        prisma.assignmentAttachment.create({
          data: {
            assignmentId,
            name: f.originalname,
            url: `${hostBase}/uploads/assignments/${f.filename}`,
            size: f.size,
            mimeType: f.mimetype,
            uploadedById,
          },
        })
      )
    );

    res.status(201).json({ count: created.length, attachments: created });
  })
);

/// Force-download an attachment with Content-Disposition: attachment so the
/// browser saves the file instead of previewing it. Works cross-origin because
/// the response is auth'd and streamed directly from the backend.
router.get(
  '/attachments/:attachmentId/download',
  auth,
  asyncHandler(async (req, res) => {
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const att = await prisma.assignmentAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!att) return res.status(404).json({ message: 'Not found' });
    const filename = att.url.split('/').pop();
    if (!filename) return res.status(404).json({ message: 'Not found' });
    const filepath = path.join(ASSIGNMENT_UPLOAD_DIR, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'File missing on disk' });
    res.download(filepath, att.name);
  })
);

router.delete(
  '/:assignmentId/attachments/:attachmentId',
  auth,
  requireAssignmentManage(),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    const att = await prisma.assignmentAttachment.findFirst({
      where: { id: attachmentId, assignmentId },
    });
    if (!att) return res.status(404).json({ message: 'Attachment not found' });

    await prisma.assignmentAttachment.delete({ where: { id: attachmentId } });
    // Best-effort file cleanup. Filename is the last URL segment.
    try {
      const filename = att.url.split('/').pop();
      if (filename) fs.unlinkSync(path.join(ASSIGNMENT_UPLOAD_DIR, filename));
    } catch {}
    res.json({ success: true });
  })
);

router.get('/:assignmentId/submissions', auth, requireAssignmentSubmissionsRead(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: parseInt(assignmentId, 10) },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } }
    },
    orderBy: { submitted_at: 'desc' },
  });

  res.json(submissions);
}));

router.post('/:assignmentId/submissions', auth, requireStudentSubmission(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { studentId, link, content } = req.body;
  const selfId = req.user.sub;
  const targetStudentId = studentId != null ? Number(studentId) : selfId;
  if (targetStudentId !== selfId) {
    return res.status(403).json({ message: "You may only submit as yourself" });
  }

  const content_url = link || content || "";
  if (!content_url) {
    return res.status(400).json({ message: "link or content (content_url) is required" });
  }

  // Submission window: must be inside [open_at, effectiveDue] where the
  // effective due date can be extended per-student via SubmissionExtension.
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, open_at: true, due_date: true, lateWindowMinutes: true },
  });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

  const now = new Date();
  if (assignment.open_at && now < assignment.open_at) {
    return res.status(403).json({
      message: `Submissions open at ${assignment.open_at.toISOString()}`,
    });
  }

  const ext = await prisma.submissionExtension.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: selfId } },
  });
  const effectiveDue = ext?.newDueAt && ext.newDueAt > assignment.due_date ? ext.newDueAt : assignment.due_date;
  const closeWithGrace = new Date(effectiveDue.getTime() + assignment.lateWindowMinutes * 60_000);
  if (now > closeWithGrace) {
    return res.status(403).json({ message: 'Submissions closed' });
  }
  const isLate = now > effectiveDue;

  const submission = await prisma.submission.create({
    data: {
      assignmentId,
      studentId: targetStudentId,
      content_url,
      is_late: isLate,
    },
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } }
    },
  });

  res.json(submission);
}));

router.patch('/:assignmentId/submissions/:submissionId', auth, requireSubmissionGrade(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const submissionId = parseInt(req.params.submissionId, 10);
  const { grade, feedback, is_reviewed } = req.body;

  const existing = await prisma.submission.findFirst({
    where: { id: submissionId, assignmentId },
    include: { assignment: { select: { id: true, gradingScope: true } } },
  });
  if (!existing) {
    return res.status(404).json({ message: "Submission not found" });
  }

  const data = {
    ...(grade !== undefined && { grade }),
    ...(feedback !== undefined && { feedback }),
    ...(is_reviewed !== undefined && { is_reviewed }),
  };

  // For GROUP assignments, apply grade/feedback/is_reviewed to every member's
  // submission for this assignment. Members without a submission row get one
  // created so they end up with the shared grade.
  if (existing.assignment?.gradingScope === 'GROUP' && existing.groupId != null) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: existing.groupId },
      select: { memberId: true },
    });
    const memberIds = members.map((m) => m.memberId);

    await prisma.$transaction(async (tx) => {
      await tx.submission.updateMany({
        where: { assignmentId, groupId: existing.groupId },
        data,
      });
      const haveSubmissions = await tx.submission.findMany({
        where: { assignmentId, groupId: existing.groupId },
        select: { studentId: true },
      });
      const have = new Set(haveSubmissions.map((s) => s.studentId));
      const missing = memberIds.filter((id) => !have.has(id));
      if (missing.length > 0) {
        await tx.submission.createMany({
          data: missing.map((studentId) => ({
            assignmentId,
            studentId,
            groupId: existing.groupId,
            content_url: existing.content_url,
            ...data,
          })),
        });
      }
    });

    const updated = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { student: { select: { id: true, full_name: true, email: true, number: true } } },
    });

    // Best-effort: notify every group member that a grade landed.
    if (grade !== undefined) {
      const a = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { title: true, courseOfferingId: true },
      });
      if (a) {
        pushToUsers(memberIds, {
          title: 'Group grade returned',
          body: `${a.title}: ${grade}%`,
          url: `/dashboard/courses/${a.courseOfferingId}?tab=assignments`,
          tag: `grade-${assignmentId}`,
        }).catch(() => {});
      }
    }
    return res.json(updated);
  }

  const submission = await prisma.submission.update({
    where: { id: submissionId },
    data,
    include: {
      student: { select: { id: true, full_name: true, email: true, number: true } }
    },
  });

  if (grade !== undefined) {
    const a = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { title: true, courseOfferingId: true },
    });
    if (a) {
      pushToUser(submission.studentId, {
        title: 'Grade returned',
        body: `${a.title}: ${grade}%`,
        url: `/dashboard/courses/${a.courseOfferingId}?tab=assignments`,
        tag: `grade-${assignmentId}`,
      }).catch(() => {});
    }
  }

  res.json(submission);
}));

/// AI grading assist. Reads the assignment + submission and asks Claude for a
/// suggested grade + feedback. The response is a draft for the teacher to
/// accept, edit, or discard — nothing is written to the Submission row here.
router.post(
  '/:assignmentId/submissions/:submissionId/ai-suggest',
  auth,
  requireSubmissionGrade(),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const submissionId = parseInt(req.params.submissionId, 10);
    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, assignmentId },
      include: {
        assignment: { select: { title: true, description: true, lateWindowMinutes: true } },
        student: { select: { full_name: true } },
      },
    });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (!submission.content_url) {
      return res.status(400).json({ message: 'This submission has no content to grade' });
    }

    try {
      const suggestion = await suggestGradeForSubmission({
        assignment: submission.assignment,
        submission,
        student: submission.student,
      });
      res.json(suggestion);
    } catch (e) {
      // Surface the configuration error (missing API key) distinctly from
      // model failures so the frontend can show a useful toast.
      const message = e instanceof Error ? e.message : 'AI suggestion failed';
      const status = /not configured/i.test(message) ? 503 : 502;
      res.status(status).json({ message });
    }
  })
);

router.get('/:assignmentId/extensions', auth, requireAssignmentSubmissionsRead(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const extensions = await prisma.submissionExtension.findMany({
    where: { assignmentId },
    include: {
      student: { select: { id: true, full_name: true, number: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { newDueAt: 'asc' },
  });
  res.json(extensions);
}));

router.post('/:assignmentId/extensions', auth, requireAssignmentManage(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { studentId, groupId, newDueAt, reason } = req.body ?? {};
  if (!newDueAt) return res.status(400).json({ message: 'newDueAt is required' });
  if (!studentId === !groupId) {
    return res.status(400).json({ message: 'Exactly one of studentId or groupId is required' });
  }

  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  if (assignment.gradingScope === 'GROUP' && !groupId) {
    return res.status(400).json({ message: 'Group-graded assignment requires groupId' });
  }
  if (assignment.gradingScope === 'INDIVIDUAL' && !studentId) {
    return res.status(400).json({ message: 'Individually-graded assignment requires studentId' });
  }

  const where = studentId
    ? { assignmentId_studentId: { assignmentId, studentId: Number(studentId) } }
    : { assignmentId_groupId: { assignmentId, groupId: Number(groupId) } };

  const extension = await prisma.submissionExtension.upsert({
    where,
    create: {
      assignmentId,
      studentId: studentId ? Number(studentId) : null,
      groupId: groupId ? Number(groupId) : null,
      newDueAt: new Date(newDueAt),
      reason: reason ?? null,
      grantedById: req.user.id ?? req.user.sub,
    },
    update: { newDueAt: new Date(newDueAt), reason: reason ?? null },
  });

  // Push the affected student(s). For a group-targeted extension we look up
  // every member; for a student-targeted one it's just the one.
  (async () => {
    let userIds = [];
    if (studentId) userIds = [Number(studentId)];
    else if (groupId) {
      const members = await prisma.groupMember.findMany({
        where: { groupId: Number(groupId) },
        select: { memberId: true },
      });
      userIds = members.map((m) => m.memberId);
    }
    if (userIds.length === 0) return;
    pushToUsers(userIds, {
      title: 'Another chance granted',
      body: `${assignment.title} · new due ${new Date(newDueAt).toLocaleString()}`,
      url: `/dashboard/courses/${assignment.courseOfferingId}?tab=assignments`,
      tag: `extension-${assignmentId}`,
    }).catch(() => {});
  })();

  res.status(201).json(extension);
}));

/// Grant the same extension to N students or N groups in one call. Used by
/// the "Give another chance" UI when the teacher wants several students to
/// resubmit by the same deadline.
router.post('/:assignmentId/extensions/batch', auth, requireAssignmentManage(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { studentIds = [], groupIds = [], newDueAt, reason } = req.body ?? {};
  if (!newDueAt) return res.status(400).json({ message: 'newDueAt is required' });
  if ((!Array.isArray(studentIds) || studentIds.length === 0) &&
      (!Array.isArray(groupIds) || groupIds.length === 0)) {
    return res.status(400).json({ message: 'Provide studentIds[] or groupIds[]' });
  }

  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  if (assignment.gradingScope === 'GROUP' && studentIds.length > 0) {
    return res.status(400).json({ message: 'Group-graded assignment: pass groupIds, not studentIds' });
  }
  if (assignment.gradingScope === 'INDIVIDUAL' && groupIds.length > 0) {
    return res.status(400).json({ message: 'Individually-graded assignment: pass studentIds, not groupIds' });
  }

  const newDate = new Date(newDueAt);
  const grantedById = req.user.id ?? req.user.sub;

  const results = await prisma.$transaction([
    ...studentIds.map((sid) =>
      prisma.submissionExtension.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId: Number(sid) } },
        create: { assignmentId, studentId: Number(sid), newDueAt: newDate, reason: reason ?? null, grantedById },
        update: { newDueAt: newDate, reason: reason ?? null },
      })
    ),
    ...groupIds.map((gid) =>
      prisma.submissionExtension.upsert({
        where: { assignmentId_groupId: { assignmentId, groupId: Number(gid) } },
        create: { assignmentId, groupId: Number(gid), newDueAt: newDate, reason: reason ?? null, grantedById },
        update: { newDueAt: newDate, reason: reason ?? null },
      })
    ),
  ]);

  // Resolve every affected student (group → members) and push.
  (async () => {
    const direct = studentIds.map((n) => Number(n));
    const groupMembers = groupIds.length
      ? (
          await prisma.groupMember.findMany({
            where: { groupId: { in: groupIds.map((n) => Number(n)) } },
            select: { memberId: true },
          })
        ).map((m) => m.memberId)
      : [];
    const affected = [...direct, ...groupMembers];
    if (affected.length === 0) return;
    pushToUsers(affected, {
      title: 'Another chance granted',
      body: `${assignment.title} · new due ${newDate.toLocaleString()}`,
      url: `/dashboard/courses/${assignment.courseOfferingId}?tab=assignments`,
      tag: `extension-${assignmentId}`,
    }).catch(() => {});
  })();

  res.status(201).json({ count: results.length, extensions: results });
}));

router.delete('/:assignmentId/extensions/:extensionId', auth, requireAssignmentManage(), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.extensionId, 10);
  await prisma.submissionExtension.delete({ where: { id } });
  res.json({ success: true });
}));

// ────────────────────────────────────────────────────────────────────────────
// iCalendar (.ics) feeds — let students add assignment deadlines to their
// calendar app. RFC 5545. Date format is UTC basic (YYYYMMDDTHHMMSSZ).
// ────────────────────────────────────────────────────────────────────────────

function icsDate(date) {
  // 2026-05-19T14:00:00.000Z -> 20260519T140000Z
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildIcs(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus Connect//Assignments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const now = icsDate(new Date());
  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${icsDate(ev.start)}`);
    lines.push(`DTEND:${icsDate(ev.end ?? ev.start)}`);
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/// Single-assignment .ics. Two events: "opens" (if open_at set) and "due".
router.get('/:assignmentId/calendar.ics', auth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.assignmentId, 10);
  const a = await prisma.assignment.findUnique({ where: { id } });
  if (!a) return res.status(404).json({ message: 'Not found' });

  const events = [];
  if (a.open_at) {
    events.push({
      uid: `assignment-${id}-open@campus-connect`,
      start: a.open_at,
      end: new Date(a.open_at.getTime() + 30 * 60_000),
      title: `Opens: ${a.title}`,
      description: a.description ?? '',
    });
  }
  events.push({
    uid: `assignment-${id}-due@campus-connect`,
    start: a.due_date,
    end: new Date(a.due_date.getTime() + 30 * 60_000),
    title: `Due: ${a.title}`,
    description: a.description ?? '',
  });

  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="assignment-${id}.ics"`);
  res.send(buildIcs(events));
}));

/// All assignments in a course offering as one .ics file. Useful for
/// subscribing once and getting every deadline.
router.get('/course/:courseOfferingId/calendar.ics', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  const list = await prisma.assignment.findMany({
    where: { courseOfferingId, is_draft: false },
    select: { id: true, title: true, description: true, open_at: true, due_date: true },
    orderBy: { due_date: 'asc' },
  });
  const events = [];
  for (const a of list) {
    if (a.open_at) {
      events.push({
        uid: `assignment-${a.id}-open@campus-connect`,
        start: a.open_at,
        end: new Date(a.open_at.getTime() + 30 * 60_000),
        title: `Opens: ${a.title}`,
        description: a.description ?? '',
      });
    }
    events.push({
      uid: `assignment-${a.id}-due@campus-connect`,
      start: a.due_date,
      end: new Date(a.due_date.getTime() + 30 * 60_000),
      title: `Due: ${a.title}`,
      description: a.description ?? '',
    });
  }
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="course-${courseOfferingId}-assignments.ics"`);
  res.send(buildIcs(events));
}));

// ────────────────────────────────────────────────────────────────────────────
// Per-student profile aggregate — powers the Roster drawer. Single round-trip
// for everything the drawer needs: assignment submissions, quiz attempts,
// derived stats (avg grade, late count, missing count).
// ────────────────────────────────────────────────────────────────────────────
router.get(
  '/course/:courseOfferingId/students/:studentId/work',
  auth,
  requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
    const studentId = parseInt(req.params.studentId, 10);
    if (!Number.isInteger(courseOfferingId) || !Number.isInteger(studentId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const [assignments, submissions, quizAttempts] = await Promise.all([
      prisma.assignment.findMany({
        where: { courseOfferingId },
        select: { id: true, title: true, due_date: true, gradingScope: true },
        orderBy: { due_date: 'asc' },
      }),
      prisma.submission.findMany({
        where: {
          studentId,
          assignment: { courseOfferingId },
        },
        select: {
          id: true,
          assignmentId: true,
          grade: true,
          feedback: true,
          is_late: true,
          is_reviewed: true,
          submitted_at: true,
          content_url: true,
        },
        orderBy: { submitted_at: 'desc' },
      }),
      prisma.quizAttempt.findMany({
        where: {
          studentId,
          quiz: { courseOfferingId },
        },
        select: {
          id: true,
          quizId: true,
          score: true,
          grade: true,
          submitted_at: true,
          quiz: { select: { id: true, title: true, passing_score: true } },
        },
        orderBy: { submitted_at: 'desc' },
      }),
    ]);

    const submittedAssignmentIds = new Set(submissions.map((s) => s.assignmentId));
    const missingCount = assignments.filter((a) => !submittedAssignmentIds.has(a.id)).length;
    const lateCount = submissions.filter((s) => s.is_late).length;
    const graded = submissions.filter((s) => typeof s.grade === 'number');
    const avgGrade =
      graded.length > 0
        ? Math.round((graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / graded.length) * 10) /
          10
        : null;

    res.json({
      assignments,
      submissions,
      quizAttempts,
      stats: {
        totalAssignments: assignments.length,
        submittedCount: submissions.length,
        missingCount,
        lateCount,
        gradedCount: graded.length,
        avgGrade,
      },
    });
  })
);

export default router;
