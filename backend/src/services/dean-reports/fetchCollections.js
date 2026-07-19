import { fetchAcademicCollections } from './fetchAcademicCollections.js';
import { fetchPeopleCollections } from './fetchPeopleCollections.js';

export async function fetchReportCollections({ facultyId, offeringIds, since, prevSince }) {
  const [academic, people] = await Promise.all([
    fetchAcademicCollections({ offeringIds, since }),
    fetchPeopleCollections({ facultyId, since, prevSince }),
  ]);

  return { ...academic, ...people };
}
