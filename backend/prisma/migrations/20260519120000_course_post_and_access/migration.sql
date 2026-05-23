-- CreateTable
CREATE TABLE "CoursePost" (
    "id" SERIAL NOT NULL,
    "courseOfferingId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePostAttachment" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,

    CONSTRAINT "CoursePostAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOfferingAccess" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseOfferingId" INTEGER NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseOfferingAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoursePost_courseOfferingId_created_at_idx" ON "CoursePost"("courseOfferingId", "created_at");

-- CreateIndex
CREATE INDEX "CoursePost_authorId_idx" ON "CoursePost"("authorId");

-- CreateIndex
CREATE INDEX "CoursePostAttachment_postId_idx" ON "CoursePostAttachment"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseOfferingAccess_userId_courseOfferingId_key" ON "CourseOfferingAccess"("userId", "courseOfferingId");

-- CreateIndex
CREATE INDEX "CourseOfferingAccess_courseOfferingId_lastSeenAt_idx" ON "CourseOfferingAccess"("courseOfferingId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "CoursePost" ADD CONSTRAINT "CoursePost_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePost" ADD CONSTRAINT "CoursePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePostAttachment" ADD CONSTRAINT "CoursePostAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CoursePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOfferingAccess" ADD CONSTRAINT "CourseOfferingAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOfferingAccess" ADD CONSTRAINT "CourseOfferingAccess_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
