-- Allow reviewed-without-score (Mark missing / Save without grade)
ALTER TABLE "SubmissionGrade" ALTER COLUMN "score" DROP NOT NULL;
