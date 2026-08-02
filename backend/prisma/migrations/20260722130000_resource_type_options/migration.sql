-- CreateTable
CREATE TABLE "ResourceTypeOption" (
    "id" SERIAL NOT NULL,
    "code" "ResourceType" NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceTypeOption_code_key" ON "ResourceTypeOption"("code");

-- CreateIndex
CREATE INDEX "ResourceTypeOption_isActive_sortOrder_idx" ON "ResourceTypeOption"("isActive", "sortOrder");

-- Seed catalog (Syllabus / Assignment inactive — kept for legacy rows)
INSERT INTO "ResourceTypeOption" ("code", "label", "sortOrder", "isActive", "updatedAt") VALUES
  ('LECTURE_NOTE', 'Lecture Note', 10, true, CURRENT_TIMESTAMP),
  ('VIDEO', 'Video', 20, true, CURRENT_TIMESTAMP),
  ('AUDIO', 'Audio', 30, true, CURRENT_TIMESTAMP),
  ('EXTERNAL_LINK', 'External Link', 40, true, CURRENT_TIMESTAMP),
  ('OTHER', 'Other', 50, true, CURRENT_TIMESTAMP),
  ('SYLLABUS', 'Syllabus', 60, false, CURRENT_TIMESTAMP),
  ('ASSIGNMENT', 'Assignment', 70, false, CURRENT_TIMESTAMP);
