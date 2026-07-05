-- Drop unused tables: AnnouncementTemplate (never wired in app) and QuestionTag (superseded by Question bank).

DROP TABLE IF EXISTS "AnnouncementTemplate";
DROP TABLE IF EXISTS "QuestionTag";
