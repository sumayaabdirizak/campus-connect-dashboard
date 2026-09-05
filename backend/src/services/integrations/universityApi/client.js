import { buildPartnerAuthHeaders } from './partnerAuth.js';
import { getUniversityApiConfig, isUniversityAisConfigured } from './config.js';

export class UniversityApiError extends Error {
  /** @param {string} message */
  constructor(message, { status, resultCode, errorCode, body } = {}) {
    super(message);
    this.name = 'UniversityApiError';
    this.status = status;
    this.resultCode = resultCode;
    this.errorCode = errorCode;
    this.body = body;
  }
}

function parseEnvelope(json) {
  if (!json || typeof json !== 'object') {
    throw new UniversityApiError('Invalid JSON response from university API');
  }
  const code = String(json.resultCode ?? '');
  if (code !== '0') {
    throw new UniversityApiError(json.resultMessage || 'University API error', {
      resultCode: code,
      errorCode: json.error ?? null,
      body: json,
    });
  }
  return json.data;
}

/**
 * Low-level HTTP client for Jazeera University AIS (Campus Connect v1 API).
 */
export class UniversityApiClient {
  /** @param {{ baseUrl: string; partnerCode: string; apiKey: string }} config */
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.partnerCode = config.partnerCode;
    this.apiKey = config.apiKey;
  }

  static fromEnv() {
    if (!isUniversityAisConfigured()) {
      throw new UniversityApiError('University API is not configured (set UNIVERSITY_API_* env vars)');
    }
    return new UniversityApiClient(getUniversityApiConfig());
  }

  /**
   * @param {string} path — e.g. `/v1/ping` or `/v1/dean/faculties`
   * @param {{ method?: string; body?: object; accessToken?: string; query?: Record<string, string | number> }} opts
   */
  async request(path, { method = 'GET', body, accessToken, query } = {}) {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && String(v) !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers = {
      ...buildPartnerAuthHeaders({
        apiKey: this.apiKey,
        partnerCode: this.partnerCode,
      }),
      Accept: 'application/json',
    };

    if (accessToken) {
      headers['X-Access-Token'] = accessToken.startsWith('Bearer ')
        ? accessToken
        : accessToken;
    }

    const init = { method, headers };
    if (body != null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new UniversityApiError('University API returned non-JSON response', {
        status: res.status,
        body: text?.slice(0, 500),
      });
    }

    if (!res.ok) {
      const msg =
        json?.resultMessage || json?.message || `University API HTTP ${res.status}`;
      throw new UniversityApiError(msg, {
        status: res.status,
        resultCode: json?.resultCode,
        errorCode: json?.error,
        body: json,
      });
    }

    return parseEnvelope(json);
  }

  ping() {
    return this.request('/v1/ping');
  }

  deanLogin(username, password) {
    return this.request('/v1/auth/dean/login', {
      method: 'POST',
      body: { username, password },
    });
  }

  studentLogin(username, password) {
    return this.request('/v1/auth/student/login', {
      method: 'POST',
      body: { username, password },
    });
  }

  deanFaculties(accessToken) {
    return this.request('/v1/dean/faculties', { accessToken });
  }

  deanDepartments(facultyId, accessToken) {
    return this.request('/v1/dean/departments', {
      accessToken,
      query: { facultyId },
    });
  }

  deanBatches(facultyId, departmentId, accessToken) {
    return this.request('/v1/dean/batches', {
      accessToken,
      query: { facultyId, departmentId },
    });
  }

  deanStudents({ facultyId, departmentId, batch, status, limit, offset }, accessToken) {
    return this.request('/v1/dean/students', {
      accessToken,
      query: { facultyId, departmentId, batch, status, limit, offset },
    });
  }

  deanCourses({ facultyId, batch, term, semester, departmentId, limit, offset }, accessToken) {
    return this.request('/v1/dean/courses', {
      accessToken,
      query: { facultyId, batch, term, semester, departmentId, limit, offset },
    });
  }

  deanLecturers({ facultyId, departmentId }, accessToken) {
    return this.request('/v1/dean/lecturers', {
      accessToken,
      query: { facultyId, departmentId },
    });
  }

  deanLecturerCourses({ lecturerId, semester, academicYear }, accessToken) {
    return this.request('/v1/dean/lecturer-courses', {
      accessToken,
      query: { lecturerId, semester, academicYear },
    });
  }

  studentMe(accessToken) {
    return this.request('/v1/students/me', { accessToken });
  }

  /** Per-student academic year + semester (partner auth; dean token optional). */
  studentAcademicStanding(studentId, accessToken) {
    return this.request('/v1/students/academic-standing', {
      accessToken,
      query: { studentId },
    });
  }

  /** Active term + offerings (partner auth only). Defaults to university active term. */
  courseOfferings({ facultyId, departmentId, batch, semester, academicYear, limit, offset }) {
    return this.request('/v1/courses/offerings', {
      query: { facultyId, departmentId, batch, semester, academicYear, limit, offset },
    });
  }

  studentEnrollment(studentId) {
    return this.request('/v1/students/enrollment', {
      query: { studentId },
    });
  }
}
