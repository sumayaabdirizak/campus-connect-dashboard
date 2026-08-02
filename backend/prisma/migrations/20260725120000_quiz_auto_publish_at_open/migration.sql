-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN "auto_publish_at_open" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Quiz_is_draft_auto_publish_at_open_open_at_idx" ON "Quiz"("is_draft", "auto_publish_at_open", "open_at");
