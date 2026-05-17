-- CreateTable
CREATE TABLE "DepartmentProgramLevel" (
    "id" SERIAL NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "level" "ProgramLevel" NOT NULL,

    CONSTRAINT "DepartmentProgramLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentProgramLevel_departmentId_level_key" ON "DepartmentProgramLevel"("departmentId", "level");

-- AddForeignKey
ALTER TABLE "DepartmentProgramLevel" ADD CONSTRAINT "DepartmentProgramLevel_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
