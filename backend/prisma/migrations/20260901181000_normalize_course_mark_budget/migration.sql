-- Scale published assignment + quiz weights proportionally when they exceed Course.maxMarks.
-- Legacy rows often used maxMarks=100 per item before the shared 100-mark budget existed.

CREATE TEMP TABLE _mark_budget_fix AS
SELECT
  co.id AS offering_id,
  c."maxMarks" AS course_max,
  (
    COALESCE((
      SELECT SUM(a."maxMarks")
      FROM "Assignment" a
      INNER JOIN "AssignmentLifecycle" al ON al."assignmentId" = a.id
      WHERE a."courseOfferingId" = co.id AND al."publishStatus" = 'PUBLISHED'
    ), 0)
    +
    COALESCE((
      SELECT SUM(q."maxMarks")
      FROM "Quiz" q
      WHERE q."courseOfferingId" = co.id AND q."is_draft" = false
    ), 0)
  ) AS allocated
FROM "CourseOffering" co
INNER JOIN "Course" c ON c.id = co."courseId"
WHERE (
  COALESCE((
    SELECT SUM(a."maxMarks")
    FROM "Assignment" a
    INNER JOIN "AssignmentLifecycle" al ON al."assignmentId" = a.id
    WHERE a."courseOfferingId" = co.id AND al."publishStatus" = 'PUBLISHED'
  ), 0)
  +
  COALESCE((
    SELECT SUM(q."maxMarks")
    FROM "Quiz" q
    WHERE q."courseOfferingId" = co.id AND q."is_draft" = false
  ), 0)
) > c."maxMarks";

UPDATE "Assignment" a
SET "maxMarks" = GREATEST(1, ROUND(a."maxMarks" * (mb.course_max::numeric / mb.allocated)))
FROM "AssignmentLifecycle" al, _mark_budget_fix mb
WHERE al."assignmentId" = a.id
  AND al."publishStatus" = 'PUBLISHED'
  AND a."courseOfferingId" = mb.offering_id;

UPDATE "Quiz" q
SET "maxMarks" = GREATEST(1, ROUND(q."maxMarks" * (mb.course_max::numeric / mb.allocated)))
FROM _mark_budget_fix mb
WHERE q."courseOfferingId" = mb.offering_id
  AND q."is_draft" = false
  AND q."maxMarks" > 0;

UPDATE "SubmissionGrade" sg
SET "score" = LEAST(sg."score", a."maxMarks")
FROM "Submission" s
INNER JOIN "Assignment" a ON a.id = s."assignmentId"
WHERE sg."submissionId" = s.id
  AND sg."score" IS NOT NULL
  AND sg."score" > a."maxMarks";

-- Draft assignments still on the legacy default should not reserve 100 marks on publish.
UPDATE "Assignment" a
SET "maxMarks" = 10
FROM "AssignmentLifecycle" al
WHERE al."assignmentId" = a.id
  AND al."publishStatus" = 'DRAFT'
  AND a."maxMarks" = 100;

ALTER TABLE "Assignment" ALTER COLUMN "maxMarks" SET DEFAULT 10;
