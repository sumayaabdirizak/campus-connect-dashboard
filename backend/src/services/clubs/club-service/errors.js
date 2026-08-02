export class ClubServiceError extends Error {
  constructor(message, { code, status = 400, details = null } = {}) {
    super(message);
    this.code = code;
    this.statusCode = status;
    this.details = details;
  }
}
