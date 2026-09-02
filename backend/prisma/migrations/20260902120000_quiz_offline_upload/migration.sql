-- Offline quiz delivery mode + optional uploaded paper file.
ALTER TABLE "Quiz" ADD COLUMN "offline_delivery" TEXT;

CREATE TABLE "QuizPaperFile" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,
    "uploadedById" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizPaperFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuizPaperFile_quizId_key" ON "QuizPaperFile"("quizId");
CREATE INDEX "QuizPaperFile_quizId_idx" ON "QuizPaperFile"("quizId");

ALTER TABLE "QuizPaperFile" ADD CONSTRAINT "QuizPaperFile_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizPaperFile" ADD CONSTRAINT "QuizPaperFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
