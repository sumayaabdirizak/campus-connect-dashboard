import { resolveActiveSemesterWindow } from '../../../services/academic/resolveActiveSemesterWindow.js';
import { respondInternalError } from '../../../utils/httpError.js';

function toIsoDate(d) {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * GET /api/academic-years/active-semester-window
 * Active university semester bounds for report custom date pickers.
 */
export async function getActiveSemesterWindow(req, res) {
  try {
    const facultyIdRaw = req.query.facultyId;
    const facultyId =
      facultyIdRaw != null && String(facultyIdRaw).trim() !== ''
        ? Number(facultyIdRaw)
        : undefined;

    const win = await resolveActiveSemesterWindow({
      ...(Number.isFinite(facultyId) && facultyId > 0 ? { facultyId } : {}),
    });

    const today = toIsoDate(new Date());
    const start = toIsoDate(win.since);
    const end = toIsoDate(win.until);
    // Custom pickers: from semester start … through today (never future).
    const maxTo = today && end && end < today ? end : today;

    return res.json({
      label: win.label,
      semesterId: win.semesterId,
      academicYearId: win.academicYearId,
      startDate: start,
      endDate: end,
      /** Earliest selectable custom From */
      minDate: start,
      /** Latest selectable custom To (today, or semester end if earlier) */
      maxDate: maxTo,
      monthsCount: win.monthsCount,
    });
  } catch (err) {
    return respondInternalError(res, 'Failed to resolve active semester window', err);
  }
}
