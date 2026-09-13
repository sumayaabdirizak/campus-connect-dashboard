import { env } from '../../../config/env.js';

/** Jazeera University AIS (outbound from Campus Connect). */
export function isUniversityAisConfigured() {
  return Boolean(
    env.UNIVERSITY_API_BASE_URL &&
      env.UNIVERSITY_API_KEY &&
      env.UNIVERSITY_API_PARTNER_CODE
  );
}

export function getUniversityApiConfig() {
  return {
    baseUrl: env.UNIVERSITY_API_BASE_URL?.replace(/\/$/, '') || '',
    partnerCode: env.UNIVERSITY_API_PARTNER_CODE || 'campus_connect',
    apiKey: env.UNIVERSITY_API_KEY || '',
    deanUsername: env.UNIVERSITY_DEAN_USERNAME || '',
    deanPassword: env.UNIVERSITY_DEAN_PASSWORD || '',
  };
}
