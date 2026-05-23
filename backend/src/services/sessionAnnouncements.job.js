import { prisma } from "../db/prisma.js";
import { dispatchCoursePost } from "./courseAnnouncementDispatcher.service.js";

/**
 * Walks today's ClassSchedule rows and posts:
 *   - a "Class starting soon" CoursePost ~LEAD_MINUTES before start_time
 *   - a "Class ended" CoursePost once end_time has passed
 *
 * Idempotent via the dispatcher's (offering, source, sourceKey) unique
 * constraint, so it's safe to run on a 1–5 minute cron.
 *
 * Wiring is intentionally left to deployment (node-cron, a separate worker,
 * Vercel cron, etc.) — call `runSessionAnnouncements()` on whatever cadence
 * fits your infra.
 */

const LEAD_MINUTES = 15;
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function parseHHMM(today, hhmm) {
  // Accepts "10:00 AM" or "10:00" — returns Date today at that time, or null.
  if (!hhmm) return null;
  const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const meridiem = (m[3] ?? '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const d = new Date(today);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export async function runSessionAnnouncements(now = new Date()) {
  const dayOfWeek = now.getDay(); // 0..6
  const schedules = await prisma.classSchedule.findMany({
    where: { day_of_week: dayOfWeek },
    select: {
      id: true,
      courseOfferingId: true,
      start_time: true,
      end_time: true,
      location: true,
      topic: true,
    },
  });

  const startWindowMs = LEAD_MINUTES * 60_000;
  let posted = 0;

  for (const s of schedules) {
    const start = parseHHMM(now, s.start_time);
    const end = parseHHMM(now, s.end_time);
    if (!start) continue;

    // Starting soon
    const timeToStart = start.getTime() - now.getTime();
    if (timeToStart > 0 && timeToStart <= startWindowMs) {
      await dispatchCoursePost({
        courseOfferingId: s.courseOfferingId,
        source: 'SESSION',
        sourceKey: `schedule:${s.id}:start:${now.toISOString().slice(0, 10)}`,
        title: 'Class starting soon',
        content: `${s.topic ?? 'Class'} · ${s.start_time} – ${s.end_time}${s.location ? ` · ${s.location}` : ''}`,
        isImportant: true,
      });
      posted++;
      continue;
    }

    // Ended (only post once per day)
    if (end && end.getTime() <= now.getTime() && now.getTime() - end.getTime() <= 60 * 60_000) {
      await dispatchCoursePost({
        courseOfferingId: s.courseOfferingId,
        source: 'SESSION',
        sourceKey: `schedule:${s.id}:end:${now.toISOString().slice(0, 10)}`,
        title: 'Class ended',
        content: `${s.topic ?? 'Class'} · ${DAY_NAMES[dayOfWeek]} ${s.start_time}–${s.end_time}${s.location ? ` · ${s.location}` : ''}`,
      });
      posted++;
    }
  }

  return { scanned: schedules.length, posted };
}
