-- Add UUID publicId for course offering URLs (keep numeric id as internal PK).
ALTER TABLE "CourseOffering" ADD COLUMN "publicId" UUID;

UPDATE "CourseOffering" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;

ALTER TABLE "CourseOffering" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "CourseOffering" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "CourseOffering_publicId_key" ON "CourseOffering"("publicId");
