-- Discussions sidebar status line (PATCH /discussions/me/status). Separate from account AccountStatus.
ALTER TABLE "User" ADD COLUMN "discussionCustomStatus" VARCHAR(80);
