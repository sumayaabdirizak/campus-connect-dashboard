import { fetchAcademicCollections } from './fetchAcademicCollections.js';
import { fetchPeopleCollections } from './fetchPeopleCollections.js';

export async function fetchReportCollections({
  facultyId,
  offeringIds,
  since,
  prevSince,
  filters = {},
}) {
  const [academic, people] = await Promise.all([
    fetchAcademicCollections({ offeringIds, since }),
    fetchPeopleCollections({ facultyId, since, prevSince, filters }),
  ]);

  return { ...academic, ...people };
}
