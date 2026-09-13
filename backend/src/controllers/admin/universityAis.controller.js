import { getAcademicInfoSystemAdapter } from '../../services/integrations/academicInfoSystem/index.js';
import { isUniversityAisConfigured } from '../../services/integrations/universityApi/config.js';
import { UniversityApiError } from '../../services/integrations/universityApi/client.js';
import { JazeeraUniversityAdapter } from '../../services/integrations/academicInfoSystem/JazeeraUniversityAdapter.js';
import { syncStudentsFromAis, syncFacultyStudentsFromAis } from '../../services/integrations/academicInfoSystem/syncStudents.js';
import {
  syncCoursesFromAisForBatch,
  syncFacultyCoursesFromAis,
} from '../../services/integrations/academicInfoSystem/syncCourses.js';
import { syncFacultyLecturersFromAis } from '../../services/integrations/academicInfoSystem/syncLecturers.js';
import { syncAcademicTermsFromAis } from '../../services/integrations/academicInfoSystem/syncAcademicTerms.js';
import { syncDeanFromAis } from '../../services/integrations/academicInfoSystem/syncDean.js';

function aisErrorStatus(err) {
  if (err instanceof UniversityApiError && err.status) return err.status;
  return 500;
}

/** GET /api/admin/university-ais/status — ping + config flags (no dean password use). */
export async function getUniversityAisStatus(_req, res) {
  const configured = isUniversityAisConfigured();
  if (!configured) {
    return res.json({
      configured: false,
      message: 'Set UNIVERSITY_API_BASE_URL, UNIVERSITY_API_PARTNER_CODE, and UNIVERSITY_API_KEY',
    });
  }

  try {
    const adapter = getAcademicInfoSystemAdapter();
    const ping = await adapter.ping();
    return res.json({
      configured: true,
      ping,
      deanCredentialsConfigured: Boolean(
        process.env.UNIVERSITY_DEAN_USERNAME && process.env.UNIVERSITY_DEAN_PASSWORD
      ),
    });
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      configured: true,
      ok: false,
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** GET /api/admin/university-ais/dean-overview — faculties visible to configured dean. */
export async function getUniversityAisDeanOverview(_req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }
  const adapter = getAcademicInfoSystemAdapter();
  if (!(adapter instanceof JazeeraUniversityAdapter)) {
    return res.status(503).json({ message: 'Jazeera adapter not active' });
  }
  try {
    const overview = await adapter.getDeanOverview();
    return res.json(overview);
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/**
 * GET /api/admin/university-ais/students-preview?facultyId=12&departmentId=12&batch=FA08
 */
export async function previewUniversityAisStudents(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }
  const facultyId = Number(req.query.facultyId);
  const departmentId = Number(req.query.departmentId);
  const batch = String(req.query.batch ?? '').trim();
  if (!facultyId || !departmentId || !batch) {
    return res.status(400).json({
      message: 'Query params facultyId, departmentId, and batch are required',
    });
  }

  try {
    const adapter = getAcademicInfoSystemAdapter();
    const students = await adapter.fetchStudents({
      facultyId,
      departmentId,
      batch,
      status: req.query.status ?? 'active',
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    return res.json({ count: students.length, students });
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** POST /api/admin/university-ais/sync-students */
export async function syncUniversityAisStudents(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const body = req.body ?? {};
  const facultyId = Number(body.facultyId ?? req.query.facultyId);
  const departmentId = Number(body.departmentId ?? req.query.departmentId);
  const batch = String(body.batch ?? req.query.batch ?? '').trim();

  if (!facultyId || !departmentId || !batch) {
    return res.status(400).json({
      message: 'facultyId, departmentId, and batch are required',
    });
  }

  try {
    const summary = await syncStudentsFromAis({
      facultyId,
      departmentId,
      batch,
      localDepartmentId: body.localDepartmentId ? Number(body.localDepartmentId) : undefined,
      localProgramId: body.localProgramId ? Number(body.localProgramId) : undefined,
      localBatchId: body.localBatchId ? Number(body.localBatchId) : undefined,
      status: body.status ?? 'active',
      dryRun: Boolean(body.dryRun),
    });
    return res.json(summary);
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** POST /api/admin/university-ais/sync-faculty-students */
export async function syncFacultyUniversityAisStudents(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const body = req.body ?? {};
  const facultyId = Number(body.facultyId ?? req.query.facultyId);
  if (!facultyId) {
    return res.status(400).json({ message: 'facultyId is required' });
  }

  try {
    const summary = await syncFacultyStudentsFromAis({
      facultyId,
      status: body.status ?? 'active',
      dryRun: Boolean(body.dryRun),
      facultyCode: body.facultyCode ? String(body.facultyCode) : undefined,
      facultyName: body.facultyName ? String(body.facultyName) : undefined,
    });
    return res.json(summary);
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** POST /api/admin/university-ais/sync-courses */
export async function syncUniversityAisCourses(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const body = req.body ?? {};
  const facultyId = Number(body.facultyId ?? req.query.facultyId);
  const batch = String(body.batch ?? req.query.batch ?? '').trim();

  if (!facultyId || !batch) {
    return res.status(400).json({ message: 'facultyId and batch are required' });
  }

  try {
    const summary = await syncCoursesFromAisForBatch({
      facultyId,
      batch,
      catalogTerm: body.catalogTerm ?? 'all',
      offeringTerm: body.offeringTerm,
      term: body.term ?? 'current',
      dryRun: Boolean(body.dryRun),
    });
    return res.json(summary);
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** POST /api/admin/university-ais/sync-faculty-courses */
export async function syncFacultyUniversityAisCourses(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const body = req.body ?? {};
  const facultyId = Number(body.facultyId ?? req.query.facultyId);
  if (!facultyId) {
    return res.status(400).json({ message: 'facultyId is required' });
  }

  try {
    const summary = await syncFacultyCoursesFromAis({
      facultyId,
      facultyCode: body.facultyCode ? String(body.facultyCode) : undefined,
      facultyName: body.facultyName ? String(body.facultyName) : undefined,
      catalogTerm: body.catalogTerm ?? 'all',
      offeringTerm: body.offeringTerm,
      term: body.term ?? 'current',
      dryRun: Boolean(body.dryRun),
    });
    return res.json(summary);
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** GET /api/admin/university-ais/lecturers-preview?facultyId=12&departmentId=21 */
export async function previewUniversityAisLecturers(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const facultyId = Number(req.query.facultyId);
  if (!facultyId) {
    return res.status(400).json({ message: 'Query param facultyId is required' });
  }

  const departmentId = req.query.departmentId
    ? Number(req.query.departmentId)
    : undefined;

  const adapter = getAcademicInfoSystemAdapter();
  try {
    const lecturers = await adapter.fetchLecturers({ facultyId, departmentId });
    return res.json({ count: lecturers.length, lecturers });
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** POST /api/admin/university-ais/sync-faculty-lecturers */
export async function syncFacultyUniversityAisLecturers(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const body = req.body ?? {};
  const facultyId = Number(body.facultyId ?? req.query.facultyId);
  if (!facultyId) {
    return res.status(400).json({ message: 'facultyId is required' });
  }

  try {
    const summary = await syncFacultyLecturersFromAis({
      facultyId,
      departmentId: body.departmentId ? Number(body.departmentId) : undefined,
      facultyCode: body.facultyCode ? String(body.facultyCode) : undefined,
      facultyName: body.facultyName ? String(body.facultyName) : undefined,
      assignOfferings: body.assignOfferings !== false,
      dryRun: Boolean(body.dryRun),
    });
    return res.json(summary);
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** GET /api/admin/university-ais/active-term?facultyId=12 */
export async function getUniversityAisActiveTerm(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const facultyId = Number(req.query.facultyId ?? 12);
  const adapter = getAcademicInfoSystemAdapter();
  if (!(adapter instanceof JazeeraUniversityAdapter)) {
    return res.status(503).json({ message: 'Jazeera adapter not active' });
  }

  try {
    const activeTerm = await adapter.fetchActiveTerm({ facultyId });
    const labels = await adapter.collectAcademicYearLabels({ facultyId });
    return res.json({ activeTerm, academicYearLabels: labels });
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** POST /api/admin/university-ais/sync-academic-terms */
export async function syncUniversityAisAcademicTerms(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const body = req.body ?? {};
  const facultyId = Number(body.facultyId ?? req.query.facultyId ?? 12);

  try {
    const summary = await syncAcademicTermsFromAis({
      facultyId,
      dryRun: Boolean(body.dryRun),
    });
    return res.json(summary);
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}

/** POST /api/admin/university-ais/sync-dean */
export async function syncUniversityAisDean(req, res) {
  if (!isUniversityAisConfigured()) {
    return res.status(503).json({ message: 'University API is not configured' });
  }

  const body = req.body ?? {};

  try {
    const summary = await syncDeanFromAis({
      dryRun: Boolean(body.dryRun),
      facultyCode: body.facultyCode ? String(body.facultyCode) : undefined,
      updatePassword: body.updatePassword !== false,
    });
    return res.json(summary);
  } catch (err) {
    return res.status(aisErrorStatus(err)).json({
      message: err.message,
      error: err instanceof UniversityApiError ? err.errorCode : undefined,
    });
  }
}
