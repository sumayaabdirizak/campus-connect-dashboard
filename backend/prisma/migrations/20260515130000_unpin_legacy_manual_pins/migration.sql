-- "Pin to top" was replaced by the Active-days window: an announcement is
-- pinned iff its `expiresAt` is in the future. Existing rows that were
-- manually pinned (isPinned=true with no expiresAt, or with an expiresAt
-- already in the past) become "normal" announcements per the new model.
--
-- Rows with a future `expiresAt` are left untouched — they remain pinned
-- for the rest of their active window, and the existing expire worker
-- will clear `isPinned` automatically when the window closes.

UPDATE "Announcement"
SET "isPinned" = false,
    "version" = "version" + 1,
    "updatedAt" = NOW()
WHERE "isPinned" = true
  AND ("expiresAt" IS NULL OR "expiresAt" <= NOW());
