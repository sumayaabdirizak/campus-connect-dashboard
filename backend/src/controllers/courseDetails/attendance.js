import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asyncHandler } from "../../utils/asyncHandler.js";
import { auth } from "../../middleware/auth.js";

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
    orderBy: { date: 'desc' },
  });

  res.json(schedules);
}));

router.post('/:courseOfferingId/sessions', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { date, start_time, end_time, topic } = req.body;

  const schedule = await prisma.classSchedule.create({
    data: {
      date: new Date(date),
      start_time,
      end_time,
      topic,
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
    where: scheduleId ? { scheduleId: parseInt(scheduleId) } : { courseOfferingId: parseInt(courseOfferingId) },
    include: {
      student: { select: { id: true, full_name: true, number: true } }
    },
    orderBy: { student: { full_name: 'asc' } },
  });

  res.json(records);
}));

router.post('/:courseOfferingId/records', auth, asyncHandler(async (req, res) => {
  const { courseOfferingId } = req.params;
  const { scheduleId, studentId, status } = req.body;

  const record = await prisma.attendance.create({
    data: {
      scheduleId,
      studentId,
      status,
      courseOfferingId: parseInt(courseOfferingId),
    },
    include: {
      student: { select: { id: true, full_name: true, number: true } }
    },
  });

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

export default router;