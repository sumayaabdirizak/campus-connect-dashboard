-- A9: per-channel slow mode (seconds between sends from the same user).
ALTER TABLE "DiscussionChannel" ADD COLUMN "slowModeSeconds" INTEGER NOT NULL DEFAULT 0;
