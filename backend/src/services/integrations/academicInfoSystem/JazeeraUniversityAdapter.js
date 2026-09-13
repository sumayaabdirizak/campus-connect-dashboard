import { AcademicInfoSystemAdapter } from './AcademicInfoSystemAdapter.js';
import { UniversityApiClient } from '../universityApi/client.js';
import { getUniversityApiConfig, isUniversityAisConfigured } from '../universityApi/config.js';

function mapAisCourse(row) {
  return {
    code: String(row.CourseCode ?? '').trim().toUpperCase(),
    name: String(row.CourseName ?? '').trim(),
    credits: Number(row.CreditHour) || 3,
    semesterNumber: row.Semester != null ? Number(row.Semester) : null,
    batchCode: row.Batch != null ? String(row.Batch) : null,
    academicYearLabel: row.AcademicYear ? String(row.AcademicYear) : null,
    externalDepartmentId: Number(row.departmentid ?? row.departmentId ?? 0) || null,
    deptName: row.DeptName ? String(row.DeptName).trim() : null,
    active: String(row.Active ?? '1') !== '0',
  };
}

function mapAisLecturer(row) {
  const id = Number(row.id ?? row.lecturerId ?? 0);
  return {
    externalId: String(id),
    fullName: String(row.employee_name ?? row.name ?? '').trim(),
    gender: row.gender != null ? String(row.gender) : null,
  };
}

function mapAisLecturerCourse(row) {
  return {
    code: String(row.CourseCode ?? '').trim().toUpperCase(),
    name: String(row.CourseName ?? '').trim(),
    semesterNumber: row.Semester != null ? Number(row.Semester) : null,
    batchCode: row.Batch != null ? String(row.Batch) : null,
    academicYearLabel: row.AcademicYear ? String(row.AcademicYear) : null,
    externalDepartmentId: Number(row.DepartmentID ?? row.departmentId ?? 0) || null,
    deptName: row.DeptName ? String(row.DeptName).trim() : null,
  };
}

function mapAisStudent(row, ctx) {
  const entryDate = row.EntryDate ? String(row.EntryDate) : null;
  const entryYear = entryDate ? Number.parseInt(entryDate.slice(0, 4), 10) : null;
  return {
    externalId: String(row.StudentID ?? row.JU_ID ?? row.id ?? ''),
    studentNumber: String(row.StudentID ?? row.JU_ID ?? ''),
    fullName: String(row.StudentName ?? '').trim(),
    email: row.Email ? String(row.Email).trim() : null,
    phone: row.Phone ? String(row.Phone).trim() : null,
    batchCode: String(row.BatchCode ?? ctx.batch ?? ''),
    section: row.Section != null ? String(row.Section) : null,
    status: String(row.Status ?? 'Enrolled'),
    entryDate,
    admissionYear:
      Number.isFinite(entryYear) && entryYear > 1980 ? entryYear : null,
    academicYearLabel: row.AcademicYear
      ? String(row.AcademicYear)
      : row.Status_AcademicYear
        ? String(row.Status_AcademicYear)
        : null,
    semesterNumber: row.Semester != null ? Number(row.Semester) : null,
    externalFacultyId: Number(ctx.facultyId),
    externalDepartmentId: Number(ctx.departmentId),
  };
}

/**
 * Jazeera University AIS — read-only REST adapter (Campus Connect v1 API).
 */
export class JazeeraUniversityAdapter extends AcademicInfoSystemAdapter {
  /** @returns {UniversityApiClient} */
  #client() {
    return UniversityApiClient.fromEnv();
  }

  async ping() {
    const data = await this.#client().ping();
    return { configured: true, ...data };
  }

  /**
   * Dean-scoped student roster for one batch.
   * Requires UNIVERSITY_DEAN_USERNAME + UNIVERSITY_DEAN_PASSWORD in env.
   *
   * @param {{ facultyId?: number; departmentId?: number; batch?: string; status?: string; limit?: number; offset?: number }} opts
   */
  async fetchStudents(opts = {}) {
    const cfg = getUniversityApiConfig();
    if (!cfg.deanUsername || !cfg.deanPassword) {
      throw new Error(
        'Set UNIVERSITY_DEAN_USERNAME and UNIVERSITY_DEAN_PASSWORD for server-side student sync'
      );
    }

    const facultyId = opts.facultyId ?? 12;
    const departmentId = opts.departmentId ?? 12;
    const batch = opts.batch;
    if (!batch) {
      throw new Error('fetchStudents requires opts.batch (e.g. FA08)');
    }

    const client = this.#client();
    const login = await client.deanLogin(cfg.deanUsername, cfg.deanPassword);
    const token = login.token;
    if (!token) {
      throw new Error('Dean login succeeded but no token returned');
    }

    const data = await client.deanStudents(
      {
        facultyId,
        departmentId,
        batch,
        status: opts.status ?? 'active',
        limit: opts.limit ?? 500,
        offset: opts.offset ?? 0,
      },
      token
    );

    const students = data.students ?? [];
    return students.map((row) =>
      mapAisStudent(row, { facultyId, departmentId, batch })
    );
  }

  async #withDeanClient() {
    const cfg = getUniversityApiConfig();
    if (!cfg.deanUsername || !cfg.deanPassword) {
      throw new Error(
        'Set UNIVERSITY_DEAN_USERNAME and UNIVERSITY_DEAN_PASSWORD for server-side student sync'
      );
    }
    const client = this.#client();
    const login = await client.deanLogin(cfg.deanUsername, cfg.deanPassword);
    const token = login.token;
    if (!token) {
      throw new Error('Dean login succeeded but no token returned');
    }
    return { client, token, login };
  }

  /** @param {number} facultyId */
  async listDepartments(facultyId) {
    const { client, token } = await this.#withDeanClient();
    const data = await client.deanDepartments(facultyId, token);
    return data.departments ?? data ?? [];
  }

  /** @param {number} facultyId @param {number} departmentId */
  async listBatches(facultyId, departmentId) {
    const { client, token } = await this.#withDeanClient();
    const data = await client.deanBatches(facultyId, departmentId, token);
    return data.batches ?? data ?? [];
  }

  /** Dean profile + faculties for faculty-wide sync labels. */
  async getDeanSession() {
    return this.#withDeanClient();
  }

  /**
   * Per-student academic year + semester from university AIS.
   * @param {string} studentId
   * @param {string} [deanToken]
   */
  async fetchStudentAcademicStanding(studentId, deanToken) {
    const client = this.#client();
    let token = deanToken;
    if (!token) {
      const session = await this.#withDeanClient();
      token = session.token;
    }
    const data = await client.studentAcademicStanding(String(studentId).trim(), token);
    return data?.standing ?? null;
  }

  /**
   * Courses offered for one batch (paginated).
   * @returns {Promise<{ meta: object; courses: object[] }>}
   */
  async fetchCourses(opts = {}) {
    const facultyId = opts.facultyId ?? 12;
    const batch = opts.batch;
    if (!batch) {
      throw new Error('fetchCourses requires opts.batch (e.g. BF03)');
    }

    const limit = opts.limit ?? 200;
    let offset = opts.offset ?? 0;
    const all = [];
    let meta = {};
    const maxPages = 50;

    const { client, token } = await this.#withDeanClient();

    for (let page = 0; page < maxPages; page += 1) {
      const data = await client.deanCourses(
        {
          facultyId,
          batch: String(batch),
          term: opts.term ?? 'current',
          semester: opts.semester,
          departmentId: opts.departmentId,
          limit,
          offset,
        },
        token
      );

      meta = {
        facultyId: data.facultyId ?? facultyId,
        batch: data.batch ?? batch,
        term: data.term,
        semester: data.semester,
        academicYear: data.academicYear,
      };

      const rows = data.courses ?? [];
      if (!rows.length) break;
      all.push(...rows.map((row) => mapAisCourse(row)));
      if (rows.length < limit) break;
      offset += limit;
    }

    return { meta, courses: all };
  }

  async fetchLecturers(opts = {}) {
    const { client, token } = await this.#withDeanClient();
    const data = await client.deanLecturers(
      {
        facultyId: opts.facultyId,
        departmentId: opts.departmentId,
      },
      token
    );
    const rows = data.lecturers ?? [];
    return rows.map((row) => mapAisLecturer(row)).filter((r) => r.externalId && r.fullName);
  }

  /**
   * Courses assigned to one AIS lecturer.
   * @param {number|string} lecturerId
   * @param {{ semester?: number; academicYear?: string }} [opts]
   */
  async fetchLecturerCourses(lecturerId, opts = {}) {
    const { client, token } = await this.#withDeanClient();
    const data = await client.deanLecturerCourses(
      {
        lecturerId: Number(lecturerId),
        semester: opts.semester,
        academicYear: opts.academicYear,
      },
      token
    );
    const rows = data.courses ?? [];
    return rows.map((row) => mapAisLecturerCourse(row)).filter((r) => r.code);
  }

  /** University active term from partner offerings API (no dean password). */
  async fetchActiveTerm(opts = {}) {
    const facultyId = opts.facultyId ?? 12;
    const data = await this.#client().courseOfferings({
      facultyId: Number(facultyId),
      limit: 1,
      offset: 0,
    });
    const term = data.term ?? {};
    const academicYear = term.academicYear ?? data.academicYear;
    const semester = term.semester ?? data.semester;
    if (!academicYear) return null;
    return {
      academicYearLabel: String(academicYear).trim(),
      semesterNumber: Number(semester) || 1,
    };
  }

  /** Distinct academic year labels seen in university offerings. */
  async collectAcademicYearLabels(opts = {}) {
    const facultyId = opts.facultyId ?? 12;
    const client = this.#client();
    const labels = new Set();
    const limit = 200;

    for (let offset = 0, page = 0; page < 50; page += 1) {
      const data = await client.courseOfferings({
        facultyId: Number(facultyId),
        limit,
        offset,
      });
      const rows = data.offerings ?? [];
      if (data.term?.academicYear) {
        labels.add(String(data.term.academicYear).trim());
      }
      for (const row of rows) {
        if (row.AcademicYear) labels.add(String(row.AcademicYear).trim());
      }
      if (rows.length < limit) break;
      offset += limit;
    }

    return [...labels].filter(Boolean).sort();
  }

  async pushGradeRecords() {
    throw new Error('University API is read-only — grade push not supported');
  }

  /** Admin diagnostics — dean login + faculties list. */
  async getDeanOverview() {
    const cfg = getUniversityApiConfig();
    if (!cfg.deanUsername || !cfg.deanPassword) {
      return { deanLogin: false, reason: 'dean credentials not configured' };
    }
    const client = this.#client();
    const login = await client.deanLogin(cfg.deanUsername, cfg.deanPassword);
    const faculties = await client.deanFaculties(login.token);
    return {
      deanLogin: true,
      profile: login.profile,
      allowedFaculties: login.allowedFaculties,
      faculties: faculties.faculties ?? faculties,
    };
  }

  static isAvailable() {
    return isUniversityAisConfigured();
  }
}
