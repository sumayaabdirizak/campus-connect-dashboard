-- Moderator-applied mute on DiscussionGroupMembership.
-- Null = not muted; future timestamp = muted until that moment.
ALTER TABLE "DiscussionGroupMembership"
  ADD COLUMN IF NOT EXISTS "mutedUntil" TIMESTAMP(3);
