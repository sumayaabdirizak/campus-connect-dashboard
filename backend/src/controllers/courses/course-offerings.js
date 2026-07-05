import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
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
import { courseOfferingDashboardPath } from "../../utils/courseOfferingAccess.js";

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

// Student submissions live in a separate directory so teacher-uploaded
// reference materials don't get mixed up with student work in storage.
// Same 25 MB cap, same filename scheme.
const SUBMISSION_UPLOAD_DIR = './uploads/submissions';
const submissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(SUBMISSION_UPLOAD_DIR)) {
      fs.mkdirSync(SUBMISSION_UPLOAD_DIR, { recursive: true });
    }
    cb(null, SUBMISSION_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const submissionUpload = multer({
  storage: submissionStorage,
  limits: { fileSize: ASSIGNMENT_FILE_LIMIT },
});

const attachmentInclude = {
  attachments: {
    orderBy: { created_at: 'asc' },
    include: { uploadedBy: { select: { id: true, full_name: true } } },
  },
};

router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const assignments = await prisma.assignment.findMany({
    where: { courseOfferingId: req.courseOffering.id },
    include: {
      submissions: { select: { id: true, studentId: true, grade: true, is_reviewed: true } },
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
    orderBy: { due_date: 'asc' },
  });

  // Compute pending-grading count per assignment from the embedded
  // submissions array (already in memory — no extra DB round-trip). A
  // submission is "pending" if it hasn't been reviewed yet. Drives the
  // teacher card badge so they can see at a glance which assignments
  // need their attention without drilling in.
  res.json(
    assignments.map((a) => ({
      ...a,
      pendingGradingCount: a.submissions.filter((s) => !s.is_reviewed).length,
    }))
  );
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

function normaliseMaxMarks(maxMarks) {
  if (maxMarks === undefined || maxMarks === null) return { data: {} };
  if (!Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
    return { error: 'maxMarks must be an integer between 1 and 100' };
  }
  return { data: { maxMarks } };
}

router.post('/:courseOfferingId', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
  const { title, description, open_at, due_date, is_draft, workMode, gradingScope, lateWindowMinutes, maxMarks } = req.body;
  const modes = normaliseModes({ workMode, gradingScope });
  if (modes.error) return res.status(400).json({ message: modes.error });
  const marks = normaliseMaxMarks(maxMarks);
  if (marks.error) return res.status(400).json({ message: marks.error });

  const openAtDate = open_at ? new Date(open_at) : null;
  const dueDateObj = due_date ? new Date(due_date) : new Date();
  if (openAtDate && openAtDate > dueDateObj) {
    return res.status(400).json({ message: 'open_at must be before due_date' });
  }

  const coId = req.courseOffering.id;
  const offeringPublicId = req.courseOffering.publicId;
  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      open_at: openAtDate,
      due_date: dueDateObj,
      is_draft: Boolean(is_draft),
      courseOfferingId: coId,
      ...modes.data,
      ...(Number.isInteger(lateWindowMinutes) ? { lateWindowMinutes } : {}),
      ...marks.data,
    },
    include: {
      submissions: true,
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
  });

  // ── Notify enrolled students when a published assignment is created ──
  if (!assignment.is_draft) {
    (async () => {
      const offering = await prisma.courseOffering.findUnique({
        where: { id: coId },
        include: {
          section: {
            include: { studentRegistrations: { select: { studentId: true } } },
          },
        },
      });
      const studentIds = offering?.section?.studentRegistrations?.map((r) => r.studentId) ?? [];
      if (studentIds.length === 0) return;
      pushToUsers(studentIds, {
        title: 'New assignment',
        body: `${assignment.title} · due ${dueDateObj.toLocaleDateString()}`,
        url: courseOfferingDashboardPath(offeringPublicId, 'assignments'),
        tag: `assignment-new-${assignment.id}`,
      }).catch(() => {});
    })();
  }

  res.json(assignment);
}));

router.patch('/:assignmentId', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { title, description, open_at, due_date, is_draft, workMode, gradingScope, lateWindowMinutes, maxMarks } = req.body;
  const modes = normaliseModes({ workMode, gradingScope });
  if (modes.error) return res.status(400).json({ message: modes.error });
  const marks = normaliseMaxMarks(maxMarks);
  if (marks.error) return res.status(400).json({ message: marks.error });

  // Snapshot the old draft state so we can detect publish transitions.
  const before = await prisma.assignment.findUnique({
    where: { id: parseInt(assignmentId, 10) },
    select: { is_draft: true },
  });

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
      ...marks.data,
    },
    include: {
      submissions: true,
      ...attachmentInclude,
      _count: { select: { submissions: true } }
    },
  });

  // ── Notify enrolled students when an assignment is published ─────────
  // Only fires on the draft→published transition (not on every PATCH).
  if (before?.is_draft && !assignment.is_draft) {
    (async () => {
      const offering = await prisma.courseOffering.findUnique({
        where: { id: assignment.courseOfferingId },
        select: {
          publicId: true,
          section: {
            include: { studentRegistrations: { select: { studentId: true } } },
          },
        },
      });
      const studentIds = offering?.section?.studentRegistrations?.map((r) => r.studentId) ?? [];
      if (studentIds.length === 0 || !offering?.publicId) return;
      pushToUsers(studentIds, {
        title: 'New assignment',
        body: `${assignment.title} · due ${new Date(assignment.due_date).toLocaleDateString()}`,
        url: courseOfferingDashboardPath(offering.publicId, 'assignments'),
        tag: `assignment-new-${assignment.id}`,
      }).catch(() => {});
    })();
  }

  res.json(assignment);
}));

router.delete('/:assignmentId', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  await prisma.submission.deleteMany({ where: { assignmentId: parseInt(assignmentId, 10) } });
  await prisma.assignment.delete({ where: { id: parseInt(assignmentId, 10) } });

  res.json({ success: true });
}));

/// Duplicate an assignment including its attachments. Lands as DRAFT with
/// "Copy of " prefix so the teacher can polish before publishing. Attachment
/// ROWS are cloned (sharing the same underlying file URLs — the file on
/// disk is referenced by URL, not copied) so the new draft has the same
/// reference materials without doubling disk usage. Submissions and
/// extensions from the source are NOT copied (they belong to the original
/// assignment and shouldn't follow the duplicate).
router.post(
  '/:assignmentId/duplicate', requireAssignmentManage(),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.assignmentId, 10);

    const source = await prisma.assignment.findUnique({
      where: { id },
      include: {
        attachments: true,
      },
    });
    if (!source) return res.status(404).json({ message: 'Assignment not found' });

    const created = await prisma.$transaction(async (tx) => {
      const fresh = await tx.assignment.create({
        data: {
          title: `Copy of ${source.title}`,
          description: source.description,
          open_at: source.open_at,
          due_date: source.due_date,
          is_draft: true, // always draft — protects against accidental publish
          courseOfferingId: source.courseOfferingId,
          workMode: source.workMode,
          gradingScope: source.gradingScope,
          lateWindowMinutes: source.lateWindowMinutes,
          maxMarks: source.maxMarks,
        },
      });

      // Clone attachment ROWS (file URLs are shared — the on-disk files
      // are referenced, not copied, since both rows point to the same URL).
      if (source.attachments.length > 0) {
        await tx.assignmentAttachment.createMany({
          data: source.attachments.map((att) => ({
            assignmentId: fresh.id,
            name: att.name,
            url: att.url,
            size: att.size,
            mimeType: att.mimeType,
            uploadedById: req.user.id ?? req.user.sub,
          })),
        });
      }

      return tx.assignment.findUnique({
        where: { id: fresh.id },
        include: {
          attachments: {
            orderBy: { created_at: 'asc' },
            include: { uploadedBy: { select: { id: true, full_name: true } } },
          },
          _count: { select: { submissions: true } },
        },
      });
    });

    res.status(201).json(created);
  })
);

/// Upload one or more files and attach them to an assignment. `field` is "files"
/// (array). Stores to /uploads/assignments and persists rows to
/// AssignmentAttachment so they're returned with the assignment payload.
router.post(
  '/:assignmentId/attachments', requireAssignmentManage(),
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
  '/attachments/:attachmentId/download', asyncHandler(async (req, res) => {
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
  '/:assignmentId/attachments/:attachmentId', requireAssignmentManage(),
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

router.get('/:assignmentId/submissions', requireAssignmentSubmissionsRead(), asyncHandler(async (req, res) => {
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

router.post('/:assignmentId/submissions', requireStudentSubmission(), asyncHandler(async (req, res) => {
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
    select: { id: true, open_at: true, due_date: true, lateWindowMinutes: true, workMode: true, courseOfferingId: true },
  });
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

  // ── Resolve group membership for GROUP-mode assignments ──────────────
  // The Submission.groupId column drives grade fan-out — if it's null the
  // teacher can't grade the whole group at once. We look up the student's
  // CourseGroup for this offering and reject the submit if they aren't in
  // one (they can't submit GROUP work without a group).
  // Only the group LEADER is allowed to submit for the whole group.
  let resolvedGroupId = null;
  if (assignment.workMode === 'GROUP') {
    const membership = await prisma.groupMember.findFirst({
      where: {
        memberId: selfId,
        group: { courseOfferingId: assignment.courseOfferingId },
      },
      select: { groupId: true, role: true },
    });
    if (!membership) {
      return res.status(400).json({
        message: 'You must be in a group to submit a group assignment. Ask your teacher to assign you to a group.',
      });
    }
    if (membership.role !== 'LEADER') {
      return res.status(403).json({
        message: 'Only the group leader can submit for the group.',
      });
    }
    resolvedGroupId = membership.groupId;
  }

  const now = new Date();
  if (assignment.open_at && now < assignment.open_at) {
    return res.status(403).json({
      message: `Submissions open at ${assignment.open_at.toISOString()}`,
    });
  }

  // Check for student-level OR group-level extension (whichever grants
  // the latest deadline wins). Group extensions apply when the assignment
  // is group-graded and the student belongs to a group.
  const ext = await prisma.submissionExtension.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: selfId } },
  });
  let effectiveDue = ext?.newDueAt && ext.newDueAt > assignment.due_date ? ext.newDueAt : assignment.due_date;
  if (resolvedGroupId != null) {
    const groupExt = await prisma.submissionExtension.findUnique({
      where: { assignmentId_groupId: { assignmentId, groupId: resolvedGroupId } },
    });
    if (groupExt?.newDueAt && groupExt.newDueAt > effectiveDue) {
      effectiveDue = groupExt.newDueAt;
    }
  }
  const closeWithGrace = new Date(effectiveDue.getTime() + assignment.lateWindowMinutes * 60_000);
  if (now > closeWithGrace) {
    return res.status(403).json({ message: 'Submissions closed' });
  }
  const isLate = now > effectiveDue;

  // Resubmission semantics: if the student already has a submission row for
  // this assignment we UPDATE it in place (preserving the id but resetting
  // grade/feedback/is_reviewed so the teacher knows to re-grade). Without
  // this we silently accumulated duplicate rows on every "resubmit", and
  // the teacher's submission count would lie. The grade reset is the only
  // safe behaviour — keeping the old grade on a new piece of work would
  // be misleading.
  const existing = await prisma.submission.findFirst({
    where: { assignmentId, studentId: targetStudentId },
    select: { id: true },
  });
  const submission = existing
    ? await prisma.submission.update({
        where: { id: existing.id },
        data: {
          content_url,
          is_late: isLate,
          submitted_at: now,
          grade: null,
          feedback: null,
          is_reviewed: false,
          ...(resolvedGroupId != null && { groupId: resolvedGroupId }),
        },
        include: {
          student: { select: { id: true, full_name: true, email: true, number: true } }
        },
      })
    : await prisma.submission.create({
        data: {
          assignmentId,
          studentId: targetStudentId,
          content_url,
          is_late: isLate,
          ...(resolvedGroupId != null && { groupId: resolvedGroupId }),
        },
        include: {
          student: { select: { id: true, full_name: true, email: true, number: true } }
        },
      });

  // ── Fan-out submission to all group members ──────────────────────────
  // When the leader submits for a GROUP assignment, create/update submission
  // rows for every other member in the group. This ensures the teacher sees
  // all members in the submissions list (with the shared content_url) and
  // can grade them — either as a group or individually depending on
  // gradingScope.
  if (resolvedGroupId != null) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: resolvedGroupId },
      select: { memberId: true },
    });
    const otherIds = members.map((m) => m.memberId).filter((id) => id !== targetStudentId);
    if (otherIds.length > 0) {
      await Promise.all(
        otherIds.map(async (memberId) => {
          const memberSub = await prisma.submission.findFirst({
            where: { assignmentId, studentId: memberId },
            select: { id: true },
          });
          if (memberSub) {
            await prisma.submission.update({
              where: { id: memberSub.id },
              data: {
                content_url,
                is_late: isLate,
                submitted_at: now,
                groupId: resolvedGroupId,
                grade: null,
                feedback: null,
                is_reviewed: false,
              },
            });
          } else {
            await prisma.submission.create({
              data: {
                assignmentId,
                studentId: memberId,
                content_url,
                is_late: isLate,
                groupId: resolvedGroupId,
              },
            });
          }
        })
      );
    }
  }

  res.json(submission);
}));

/// Student-side file upload for submissions. Saves to /uploads/submissions/
/// and returns the URL — the frontend then POSTs to /submissions with that
/// URL in the `link` field. We split the steps so the regular submit
/// endpoint stays simple and identical for link / text / file submissions.
router.post(
  '/:assignmentId/submissions/upload', requireStudentSubmission(),
  submissionUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const hostBase = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      url: `${hostBase}/uploads/submissions/${req.file.filename}`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  })
);

/// Returns the calling student's own submission for this assignment (or
/// null if they haven't submitted). Lets the student-side card render
/// "Submitted X · Score Y%" without scanning the full submissions list
/// (which they can't see anyway — that endpoint is teacher-only).
router.get(
  '/:assignmentId/my-submission', requireStudentSubmission(),
  asyncHandler(async (req, res) => {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const studentId = req.user.id ?? req.user.sub;
    const [submission, studentExt, assignment] = await Promise.all([
      prisma.submission.findFirst({
        where: { assignmentId, studentId },
        include: {
          student: { select: { id: true, full_name: true, email: true, number: true } },
        },
      }),
      prisma.submissionExtension.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        select: { newDueAt: true, reason: true },
      }),
      prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { courseOfferingId: true, workMode: true },
      }),
    ]);

    // Also check for a group-level extension and resolve full group info
    // if the student belongs to a group (for GROUP-mode assignments).
    let groupExt = null;
    let _groupInfo = null;
    if (assignment?.workMode === 'GROUP') {
      const membership = await prisma.groupMember.findFirst({
        where: { memberId: studentId, group: { courseOfferingId: assignment.courseOfferingId } },
        select: {
          groupId: true,
          role: true,
          group: {
            select: {
              id: true,
              name: true,
              members: {
                include: { member: { select: { id: true, full_name: true } } },
                orderBy: [{ role: 'asc' }, { joined_at: 'asc' }],
              },
            },
          },
        },
      });
      if (membership) {
        groupExt = await prisma.submissionExtension.findUnique({
          where: { assignmentId_groupId: { assignmentId, groupId: membership.groupId } },
          select: { newDueAt: true, reason: true },
        });
        _groupInfo = {
          groupId: membership.group.id,
          groupName: membership.group.name,
          isLeader: membership.role === 'LEADER',
          members: membership.group.members.map((m) => ({
            id: m.memberId,
            name: m.member.full_name,
            role: m.role,
          })),
        };
      }
    }

    // Return the latest extension deadline (student or group, whichever is later).
    const effectiveExt = (() => {
      if (!studentExt && !groupExt) return null;
      if (!studentExt) return groupExt;
      if (!groupExt) return studentExt;
      return new Date(studentExt.newDueAt) >= new Date(groupExt.newDueAt) ? studentExt : groupExt;
    })();

    // When there is no submission, return null (preserves old contract) but
    // attach `_extension` only when a submission exists. The extension is
    // also returned at the top level so the student card can use it even
    // before submitting.
    if (!submission) {
      return res.json({ _noSubmission: true, _extension: effectiveExt, _groupInfo });
    }
    res.json({ ...submission, _extension: effectiveExt, _groupInfo });
  })
);

/// Student-side course-wide grade summary. One query for everything the
/// summary card at the top of the student view needs:
///   - total published assignments in the course
///   - how many the student has submitted
///   - how many are graded
///   - how many were late
///   - how many are still missing (past due, never submitted)
///   - average grade across graded submissions
/// Cheaper than fanning out N per-assignment queries; the response is
/// flat numbers so it stays tiny on the wire.
router.get(
  '/course/:courseOfferingId/my-summary', requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const studentId = req.user.id ?? req.user.sub;
    const now = new Date();

    const [assignments, submissions] = await Promise.all([
      prisma.assignment.findMany({
        where: { courseOfferingId, is_draft: false },
        select: { id: true, due_date: true },
      }),
      prisma.submission.findMany({
        where: {
          studentId,
          assignment: { courseOfferingId, is_draft: false },
        },
        select: {
          id: true,
          assignmentId: true,
          grade: true,
          is_late: true,
          is_reviewed: true,
        },
      }),
    ]);

    const submittedIds = new Set(submissions.map((s) => s.assignmentId));
    const totalPublished = assignments.length;
    const submittedCount = submissions.length;
    const gradedSubmissions = submissions.filter(
      (s) => s.is_reviewed && typeof s.grade === 'number'
    );
    const lateCount = submissions.filter((s) => s.is_late).length;
    // "Missing" = past due AND never submitted. We don't count not-yet-due
    // assignments as missing — the student still has time.
    const missingCount = assignments.filter(
      (a) => !submittedIds.has(a.id) && new Date(a.due_date) < now
    ).length;
    const avgGrade = gradedSubmissions.length
      ? Math.round(
          (gradedSubmissions.reduce((sum, s) => sum + (s.grade ?? 0), 0) /
            gradedSubmissions.length) * 10
        ) / 10
      : null;

    res.json({
      totalPublished,
      submittedCount,
      gradedCount: gradedSubmissions.length,
      lateCount,
      missingCount,
      avgGrade,
    });
  })
);

router.patch('/:assignmentId/submissions/:submissionId', requireSubmissionGrade(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const submissionId = parseInt(req.params.submissionId, 10);
  const { grade, feedback, is_reviewed } = req.body;

  const existing = await prisma.submission.findFirst({
    where: { id: submissionId, assignmentId },
    include: { assignment: { select: { id: true, gradingScope: true, maxMarks: true } } },
  });
  if (!existing) {
    return res.status(404).json({ message: "Submission not found" });
  }

  // ── Grade range validation (uses assignment's maxMarks) ─────────────
  const cap = existing.assignment?.maxMarks ?? 100;
  if (grade !== undefined && grade !== null) {
    const g = Number(grade);
    if (Number.isNaN(g) || g < 0 || g > cap) {
      return res.status(400).json({ message: `Grade must be a number between 0 and ${cap}` });
    }
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
        select: { title: true, courseOffering: { select: { publicId: true } } },
      });
      if (a) {
        pushToUsers(memberIds, {
          title: 'Group grade returned',
          body: `${a.title}: ${grade}%`,
          url: courseOfferingDashboardPath(a.courseOffering.publicId, 'assignments'),
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
      select: { title: true, courseOffering: { select: { publicId: true } } },
    });
    if (a) {
      pushToUser(submission.studentId, {
        title: 'Grade returned',
        body: `${a.title}: ${grade}%`,
        url: courseOfferingDashboardPath(a.courseOffering.publicId, 'assignments'),
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
  '/:assignmentId/submissions/:submissionId/ai-suggest', requireSubmissionGrade(),
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

router.get('/:assignmentId/extensions', requireAssignmentSubmissionsRead(), asyncHandler(async (req, res) => {
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

router.post('/:assignmentId/extensions', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { studentId, groupId, newDueAt, reason } = req.body ?? {};
  if (!newDueAt) return res.status(400).json({ message: 'newDueAt is required' });
  if (!studentId === !groupId) {
    return res.status(400).json({ message: 'Exactly one of studentId or groupId is required' });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { courseOffering: { select: { publicId: true } } },
  });
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
      url: courseOfferingDashboardPath(assignment.courseOffering.publicId, 'assignments'),
      tag: `extension-${assignmentId}`,
    }).catch(() => {});
  })();

  res.status(201).json(extension);
}));

/// Grant the same extension to N students or N groups in one call. Used by
/// the "Give another chance" UI when the teacher wants several students to
/// resubmit by the same deadline.
router.post('/:assignmentId/extensions/batch', requireAssignmentManage(), asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  const { studentIds = [], groupIds = [], newDueAt, reason } = req.body ?? {};
  if (!newDueAt) return res.status(400).json({ message: 'newDueAt is required' });
  if ((!Array.isArray(studentIds) || studentIds.length === 0) &&
      (!Array.isArray(groupIds) || groupIds.length === 0)) {
    return res.status(400).json({ message: 'Provide studentIds[] or groupIds[]' });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { courseOffering: { select: { publicId: true } } },
  });
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
      url: courseOfferingDashboardPath(assignment.courseOffering.publicId, 'assignments'),
      tag: `extension-${assignmentId}`,
    }).catch(() => {});
  })();

  res.status(201).json({ count: results.length, extensions: results });
}));

router.delete('/:assignmentId/extensions/:extensionId', requireAssignmentManage(), asyncHandler(async (req, res) => {
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
router.get('/:assignmentId/calendar.ics', asyncHandler(async (req, res) => {
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
router.get('/course/:courseOfferingId/calendar.ics', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
  const courseOfferingId = req.courseOffering.id;
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
  res.set('Content-Disposition', `attachment; filename="course-${req.courseOffering.publicId}-assignments.ics"`);
  res.send(buildIcs(events));
}));

// ────────────────────────────────────────────────────────────────────────────
// Per-student profile aggregate — powers the Roster drawer. Single round-trip
// for everything the drawer needs: assignment submissions, quiz attempts,
// derived stats (avg grade, late count, missing count).
// ────────────────────────────────────────────────────────────────────────────
router.get(
  '/course/:courseOfferingId/students/:studentId/work', requireCourseOfferingRead(),
  asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const studentId = parseInt(req.params.studentId, 10);
    if (!Number.isInteger(studentId)) {
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
