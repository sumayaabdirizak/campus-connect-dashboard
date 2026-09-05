import {
  AcademicInfoSystemAdapter,
  NullAcademicInfoSystemAdapter,
} from './AcademicInfoSystemAdapter.js';
import { JazeeraUniversityAdapter } from './JazeeraUniversityAdapter.js';
import { isUniversityAisConfigured } from '../universityApi/config.js';

/** @returns {AcademicInfoSystemAdapter} */
export function getAcademicInfoSystemAdapter() {
  if (isUniversityAisConfigured()) {
    return new JazeeraUniversityAdapter();
  }
  return new NullAcademicInfoSystemAdapter();
}
