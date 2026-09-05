/**
 * Contract for inbound sync from an external Academic Information System.
 * @see docs/UNIVERSITY_API_INTEGRATION.md
 */
export class AcademicInfoSystemAdapter {
  /** Connectivity + partner credentials. */
  async ping() {
    throw new Error('not implemented');
  }

  /** @returns {Promise<ExternalStudentRecord[]>} */
  async fetchStudents(_opts = {}) {
    throw new Error('not implemented');
  }

  /** @returns {Promise<ExternalLecturerRecord[]>} */
  async fetchLecturers(_opts = {}) {
    throw new Error('not implemented');
  }

  async pushGradeRecords(_records) {
    throw new Error('not implemented');
  }
}

/** Default when no university API is configured. */
export class NullAcademicInfoSystemAdapter extends AcademicInfoSystemAdapter {
  async ping() {
    return { configured: false };
  }

  async fetchStudents() {
    return [];
  }

  async fetchLecturers() {
    return [];
  }

  async pushGradeRecords() {
    return { pushed: 0 };
  }
}

/**
 * @typedef {object} ExternalStudentRecord
 * @property {string} externalId
 * @property {string} studentNumber
 * @property {string} fullName
 * @property {string|null} email
 * @property {string} batchCode
 * @property {string|null} section
 * @property {string} status
 * @property {number} externalFacultyId
 * @property {number} externalDepartmentId
 */

/**
 * @typedef {object} ExternalLecturerRecord
 * @property {string} externalId
 * @property {string} fullName
 * @property {string|null} gender
 */
