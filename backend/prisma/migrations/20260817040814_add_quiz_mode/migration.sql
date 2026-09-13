-- Add Quiz.mode ("online" | "offline") — defaults existing rows to "online".
ALTER TABLE "Quiz" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'online';
