-- CreateTable
CREATE TABLE "FacultyAdminProfile" (
    "faculty_admin_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "faculty_id" INTEGER NOT NULL,

    CONSTRAINT "FacultyAdminProfile_pkey" PRIMARY KEY ("faculty_admin_id")
);

CREATE UNIQUE INDEX "FacultyAdminProfile_user_id_key" ON "FacultyAdminProfile"("user_id");

CREATE INDEX "FacultyAdminProfile_faculty_id_idx" ON "FacultyAdminProfile"("faculty_id");

ALTER TABLE "FacultyAdminProfile" ADD CONSTRAINT "FacultyAdminProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FacultyAdminProfile" ADD CONSTRAINT "FacultyAdminProfile_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
