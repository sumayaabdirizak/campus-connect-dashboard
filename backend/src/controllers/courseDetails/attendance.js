import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";
import { dispatchCoursePost } from "../../services/courseAnnouncementDispatcher.service.js";

const QR_TOKEN_TTL_SECONDS = 30;
const QR_TOKEN_SECRET = process.env.QR_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-qr-secret';

function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function signQrToken(sessionId, seed) {
  // The token's lifetime is its own TTL — students must scan within 30 s of
  // the QR rotation. Bucket the issue time so two scans within the same 30 s
  // window get the same token (idempotent), but a new bucket starts fresh.
  const bucket = Math.floor(Date.now() / (QR_TOKEN_TTL_SECONDS * 1000));
  return jwt.sign(
    { sid: sessionId, seed, bucket },
    QR_TOKEN_SECRET,
    { expiresIn: QR_TOKEN_TTL_SECONDS }
  );
}

function verifyQrToken(token) {
  return jwt.verify(token, QR_TOKEN_SECRET);
}

const router = Router();

router.get('/:courseOfferingId/sessions', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  
  const schedules = await prisma.classSchedule.findMany({
    where: { courseOfferingId: parseInt(courseOfferingId) },
    include: {
      attendance: {
        include: {
          student: { select: { id: true, full_name: true, number: true } }
        }
      }
    },
    orderBy: { id: 'desc' },
  });

  res.json(schedules);
}));

router.post('/:courseOfferingId/sessions', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { day_of_week, start_time, end_time, location, topic, is_lab } = req.body;

  const schedule = await prisma.classSchedule.create({
    data: {
      day_of_week: parseInt(day_of_week) || 0,
      start_time,
      end_time,
      location: location || '',
      topic: topic || null,
      is_lab: is_lab || false,
      courseOfferingId: parseInt(courseOfferingId),
    },
  });

  res.json(schedule);
}));

router.delete('/:courseOfferingId/sessions/:scheduleId', auth, asyncHandler(async (req, res) => {
  const { scheduleId } = req.params;

  await prisma.attendance.deleteMany({ where: { scheduleId: parseInt(scheduleId) } });
  await prisma.classSchedule.delete({ where: { id: parseInt(scheduleId) } });

  res.json({ success: true });
}));

router.get('/:courseOfferingId/records', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { scheduleId } = req.query;

  const records = await prisma.attendance.findMany({
    where: scheduleId
      ? { scheduleId: parseInt(scheduleId) }
      : { schedule: { courseOfferingId: parseInt(courseOfferingId) } },
    include: {
      student: { select: { id: true, full_name: true, number: true } }
    },
    orderBy: { student: { full_name: 'asc' } },
  });

  res.json(records);
}));

router.post('/:courseOfferingId/records', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const offeringId = parseInt(courseOfferingId, 10);
  const { scheduleId, studentId, status } = req.body;

  const record = await prisma.attendance.create({
    data: {
      scheduleId,
      studentId,
      status,
    },
    include: {
      student: { select: { id: true, full_name: true, number: true } }
    },
  });

  // Fire-and-forget: post (or upsert) the session's running attendance summary
  // into the course feed. The dispatcher dedupes on sourceKey so this runs
  // safely on every record save.
  Promise.resolve()
    .then(async () => {
      const records = await prisma.attendance.findMany({
        where: { scheduleId },
        select: { status: true },
      });
      const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
      for (const r of records) counts[r.status] = (counts[r.status] ?? 0) + 1;
      const attended = counts.PRESENT + counts.LATE;
      const total = records.length;
      await dispatchCoursePost({
        courseOfferingId: offeringId,
        source: 'ATTENDANCE',
        sourceKey: `schedule:${scheduleId}`,
        title: 'Attendance recorded',
        content: `${attended}/${total} attended · ${counts.LATE} late · ${counts.ABSENT} absent · ${counts.EXCUSED} excused`,
      });
    })
    .catch(() => { /* swallow dispatcher errors */ });

  res.json(record);
}));

router.patch('/:courseOfferingId/records/:recordId', auth, asyncHandler(async (req, res) => {
  const { recordId } = req.params;
  const { status } = req.body;

  const record = await prisma.attendance.update({
    where: { id: parseInt(recordId) },
    data: { status },
    include: {
      student: { select: { id: true, full_name: true, number: true } }
    },
  });

  res.json(record);
}));

/// Per-student attendance summary for this offering.
/// Returns { totalSessions, avgRatePct, students: [{ studentId, full_name, number,
/// present, late, absent, excused, recorded, ratePct }] }
/// ratePct counts PRESENT + LATE as "attended" (LATE still attended) over totalSessions,
/// so a student with no records yet has ratePct = 0.
router.get('/:courseOfferingId/summary', auth, asyncHandler(async (req, res) => {
  const courseOfferingId = parseInt(req.params.courseOfferingId, 10);
  if (!Number.isInteger(courseOfferingId)) {
    return res.status(400).json({ message: 'Invalid courseOfferingId' });
  }

  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      section: {
        include: {
          studentRegistrations: {
            include: {
              student: { select: { id: true, full_name: true, number: true } }
            }
          }
        }
      }
    }
  });

  if (!offering) return res.status(404).json({ message: 'Course offering not found' });

  const schedules = await prisma.classSchedule.findMany({
    where: { courseOfferingId },
    select: { id: true }
  });
  const totalSessions = schedules.length;
  const scheduleIds = schedules.map((s) => s.id);

  const grouped = scheduleIds.length > 0
    ? await prisma.attendance.groupBy({
        by: ['studentId', 'status'],
        where: { scheduleId: { in: scheduleIds } },
        _count: { _all: true }
      })
    : [];

  const tally = new Map();
  for (const row of grouped) {
    const t = tally.get(row.studentId) ?? { present: 0, late: 0, absent: 0, excused: 0 };
    if (row.status === 'PRESENT') t.present += row._count._all;
    else if (row.status === 'LATE') t.late += row._count._all;
    else if (row.status === 'ABSENT') t.absent += row._count._all;
    else if (row.status === 'EXCUSED') t.excused += row._count._all;
    tally.set(row.studentId, t);
  }

  const enrolled = offering.section?.studentRegistrations ?? [];
  const students = enrolled.map((reg) => {
    const t = tally.get(reg.student.id) ?? { present: 0, late: 0, absent: 0, excused: 0 };
    const recorded = t.present + t.late + t.absent + t.excused;
    const attended = t.present + t.late;
    const ratePct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
    return {
      studentId: reg.student.id,
      full_name: reg.student.full_name,
      number: reg.student.number,
      present: t.present,
      late: t.late,
      absent: t.absent,
      excused: t.excused,
      recorded,
      ratePct
    };
  });

  const avgRatePct = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.ratePct, 0) / students.length)
    : 0;

  res.json({ totalSessions, avgRatePct, students });
}));

router.get('/:courseOfferingId/stats', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  
  const offering = await prisma.courseOffering.findUnique({
    where: { id: parseInt(courseOfferingId) },
    include: {
      section: {
        include: {
          studentRegistrations: { select: { studentId: true } }
        }
      }
    }
  });

  const totalStudents = offering?.section?.studentRegistrations.length || 0;

  const schedules = await prisma.classSchedule.findMany({
    where: { courseOfferingId: parseInt(courseOfferingId) },
    include: { attendance: true }
  });

  const totalSessions = schedules.length;
  const presentCount = schedules.reduce((acc, s) => acc + s.attendance.filter(a => a.status === 'PRESENT').length, 0);
  const absentCount = schedules.reduce((acc, s) => acc + s.attendance.filter(a => a.status === 'ABSENT').length, 0);
  const lateCount = schedules.reduce((acc, s) => acc + s.attendance.filter(a => a.status === 'LATE').length, 0);
  const excusedCount = schedules.reduce((acc, s) => acc + s.attendance.filter(a => a.status === 'EXCUSED').length, 0);

  const totalRecords = presentCount + absentCount + lateCount + excusedCount;
  const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

  res.json({
    totalStudents,
    totalSessions,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    attendanceRate
  });
}));

// ────────────────────────────────────────────────────────────────────────────
// QR attendance — teacher opens a live session, server signs short-TTL tokens
// that rotate every 30s, students scan + post the token, server verifies
// (and optionally geofences) and records the Attendance row.
// ────────────────────────────────────────────────────────────────────────────

router.post(
  '/sessions/start',
  auth,
  asyncHandler(async (req, res) => {
    const { scheduleId, durationMinutes = 10, lat, lon, radius } = req.body ?? {};
    if (!scheduleId) return res.status(400).json({ message: 'scheduleId is required' });
    const sid = parseInt(scheduleId, 10);

    const schedule = await prisma.classSchedule.findUnique({ where: { id: sid } });
    if (!schedule) return res.status(404).json({ message: 'Class schedule not found' });

    const ttl = Math.min(Math.max(parseInt(durationMinutes, 10) || 10, 1), 120);
    const tokenSeed = crypto.randomBytes(24).toString('hex');

    const session = await prisma.attendanceSession.create({
      data: {
        scheduleId: sid,
        startedById: req.user.id ?? req.user.sub,
        endsAt: new Date(Date.now() + ttl * 60_000),
        tokenSeed,
        geofenceLat: typeof lat === 'number' ? lat : null,
        geofenceLon: typeof lon === 'number' ? lon : null,
        geofenceRadius: Number.isInteger(radius) ? radius : null,
      },
    });

    res.status(201).json({
      sessionId: session.id,
      token: signQrToken(session.id, tokenSeed),
      tokenTtlSeconds: QR_TOKEN_TTL_SECONDS,
      endsAt: session.endsAt,
      geofence:
        session.geofenceLat != null
          ? { lat: session.geofenceLat, lon: session.geofenceLon, radius: session.geofenceRadius }
          : null,
    });
  })
);

router.get(
  '/sessions/:sessionId/token',
  auth,
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.startedById !== (req.user.id ?? req.user.sub)) {
      return res.status(403).json({ message: 'Only the session owner can rotate the token' });
    }
    if (session.closedAt || session.endsAt.getTime() < Date.now()) {
      return res.status(410).json({ message: 'Session has ended' });
    }
    res.json({
      token: signQrToken(session.id, session.tokenSeed),
      tokenTtlSeconds: QR_TOKEN_TTL_SECONDS,
      endsAt: session.endsAt,
    });
  })
);

router.post(
  '/sessions/scan',
  auth,
  asyncHandler(async (req, res) => {
    const { token, lat, lon } = req.body ?? {};
    if (!token) return res.status(400).json({ message: 'token is required' });

    let payload;
    try {
      payload = verifyQrToken(token);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired QR code — ask for a fresh one' });
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: payload.sid },
    });
    if (!session || session.tokenSeed !== payload.seed) {
      return res.status(401).json({ message: 'Session token mismatch' });
    }
    if (session.closedAt || session.endsAt.getTime() < Date.now()) {
      return res.status(410).json({ message: 'Session has ended' });
    }

    // Geofence check — only when the teacher opted in.
    if (session.geofenceLat != null && session.geofenceLon != null && session.geofenceRadius) {
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return res.status(400).json({
          message: 'This session requires your location — enable location and try again',
        });
      }
      const dist = haversineMetres(session.geofenceLat, session.geofenceLon, lat, lon);
      if (dist > session.geofenceRadius) {
        return res.status(403).json({
          message: `You're ${Math.round(dist)} m away — must be within ${session.geofenceRadius} m`,
        });
      }
    }

    const studentId = req.user.id ?? req.user.sub;

    // Mark PRESENT (or LATE if the schedule's start_time has already passed by
    // more than 5 min — coarse heuristic; refine later).
    const status = 'PRESENT';

    const existing = await prisma.attendance.findFirst({
      where: { scheduleId: session.scheduleId, studentId },
    });
    const record = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { status },
        })
      : await prisma.attendance.create({
          data: { scheduleId: session.scheduleId, studentId, status },
        });

    res.status(existing ? 200 : 201).json({
      success: true,
      attendanceId: record.id,
      status,
    });
  })
);

router.post(
  '/sessions/:sessionId/stop',
  auth,
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.startedById !== (req.user.id ?? req.user.sub)) {
      return res.status(403).json({ message: 'Only the session owner can stop it' });
    }
    if (session.closedAt) return res.json({ success: true });

    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { closedAt: new Date() },
    });
    res.json({ success: true });
  })
);

export default router;