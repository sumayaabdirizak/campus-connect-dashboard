export const assignmentKeys = {
  all: ['assignments'] as const,
  list: (courseOfferingId: string) => [...assignmentKeys.all, 'list', courseOfferingId] as const,
  submissions: (assignmentId: number) =>
    [...assignmentKeys.all, 'submissions', assignmentId] as const,
  mySubmission: (assignmentId: number) =>
    [...assignmentKeys.all, 'my-submission', assignmentId] as const,
  mySummary: (courseOfferingId: string) =>
    [...assignmentKeys.all, 'my-summary', courseOfferingId] as const,
  extensions: (assignmentId: number) =>
    [...assignmentKeys.all, 'extensions', assignmentId] as const
};
