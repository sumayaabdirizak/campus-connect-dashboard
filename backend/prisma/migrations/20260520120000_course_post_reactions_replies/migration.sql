-- CreateTable: CoursePostReaction
CREATE TABLE "CoursePostReaction" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursePostReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoursePostReaction_postId_userId_emoji_key"
  ON "CoursePostReaction"("postId", "userId", "emoji");
CREATE INDEX "CoursePostReaction_postId_idx" ON "CoursePostReaction"("postId");

ALTER TABLE "CoursePostReaction" ADD CONSTRAINT "CoursePostReaction_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CoursePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoursePostReaction" ADD CONSTRAINT "CoursePostReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: CoursePostReply
CREATE TABLE "CoursePostReply" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePostReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoursePostReply_postId_created_at_idx"
  ON "CoursePostReply"("postId", "created_at");
CREATE INDEX "CoursePostReply_authorId_idx" ON "CoursePostReply"("authorId");

ALTER TABLE "CoursePostReply" ADD CONSTRAINT "CoursePostReply_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "CoursePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoursePostReply" ADD CONSTRAINT "CoursePostReply_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
