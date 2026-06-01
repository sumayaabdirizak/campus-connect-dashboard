-- CreateTable
CREATE TABLE "ResourceView" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceView_resourceId_idx" ON "ResourceView"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceView_resourceId_studentId_key" ON "ResourceView"("resourceId", "studentId");

-- AddForeignKey
ALTER TABLE "ResourceView" ADD CONSTRAINT "ResourceView_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceView" ADD CONSTRAINT "ResourceView_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
