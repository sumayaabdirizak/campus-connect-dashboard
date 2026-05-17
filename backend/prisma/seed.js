import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { runFullDiscussionSetup } from '../src/features/discussions/discussionSetup.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seeding Process ---');

  // --- Utility: Hashing Password ---
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // --- 1. Roles ---
  console.log('Seeding Roles...');
  const roleNames = ['SUPER_ADMIN', 'DEAN', 'TEACHER', 'STUDENT', 'FACULTY_ADMIN'];
  const roleMap = {};
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roleMap[name] = role.id;
  }

  // Bootstrap a deterministic SUPER_ADMIN account for local QA/RBAC checks.
  await prisma.user.upsert({
    where: { email: 'super.admin@university.edu' },
    update: {
      full_name: 'System Super Admin',
      number: 'ADMIN001',
      roleId: roleMap['SUPER_ADMIN'],
    },
    create: {
      full_name: 'System Super Admin',
      email: 'super.admin@university.edu',
      number: 'ADMIN001',
      password_hash: hashedPassword,
      roleId: roleMap['SUPER_ADMIN'],
    },
  });

  // --- 2. Academic Years & Semesters ---
  console.log('Seeding Academic Years & Semesters...');
  const academicYearData = [
    { name: '2022/2023', start: '2022-09-01', end: '2023-08-31' },
    { name: '2023/2024', start: '2023-09-01', end: '2024-08-31' },
    { name: '2024/2025', start: '2024-09-01', end: '2025-08-31' },
    { name: '2025/2026', start: '2025-09-01', end: '2026-08-31' },
  ];

  const academicYearsMap = new Map();
  const semestersAll = [];

  for (const data of academicYearData) {
    const ay = await prisma.academicYear.upsert({
      where: { name: data.name },
      update: {},
      create: {
        name: data.name,
        start_date: new Date(data.start),
        end_date: new Date(data.end),
      },
    });
    academicYearsMap.set(data.name, ay);

    // Create 2 semesters for each AY if they don't exist
    const semesterNames = ['First Semester', 'Second Semester'];
    for (let i = 0; i < 2; i++) {
        const semName = semesterNames[i];
        const existingSem = await prisma.semester.findFirst({
            where: { name: semName, academicYearId: ay.id }
        });

        let sem;
        if (!existingSem) {
            sem = await prisma.semester.create({
                data: {
                  name: semName,
                  sequence: i + 1,
                  start_date: i === 0 ? new Date(data.start) : new Date(`${data.name.split('/')[1]}-01-01`),
                  end_date: i === 0 ? new Date(`${data.name.split('/')[0]}-12-31`) : new Date(data.end),
                  academicYearId: ay.id,
                },
            });
        } else {
            sem = existingSem;
        }
        semestersAll.push(sem);
    }
  }

  const academicYears = Array.from(academicYearsMap.values());

  // --- 3. Faculties & Departments & deans ---
  console.log('Seeding Faculties, Departments & Deans...');
  const facultySpecs = [
    {
      name: 'Faculty of Computing',
      code: 'FC',
      dean: { name: 'Dr. Alan Turing', email: 'dean.computing@university.edu', number: 'DEAN001' },
      departments: [
        { name: 'Department of Computer Science', code: 'CS' },
        { name: 'Department of Information Systems', code: 'IS' },
      ],
    },
    {
      name: 'Faculty of Sciences',
      code: 'FS',
      dean: { name: 'Dr. Marie Curie', email: 'dean.sciences@university.edu', number: 'DEAN002' },
      departments: [
        { name: 'Department of Mathematics', code: 'MATH' },
        { name: 'Department of Physics', code: 'PHYS' },
      ],
    },
  ];

  const faculties = [];
  const departments = [];

  for (const fSpec of facultySpecs) {
    // Upsert Dean User
    const deanUser = await prisma.user.upsert({
      where: { email: fSpec.dean.email },
      update: {
        full_name: fSpec.dean.name,
        number: fSpec.dean.number,
      },
      create: {
        full_name: fSpec.dean.name,
        email: fSpec.dean.email,
        number: fSpec.dean.number,
        password_hash: hashedPassword,
        roleId: roleMap['DEAN'],
      },
    });

    // Create/Update Faculty
    const faculty = await prisma.faculty.upsert({
      where: { code: fSpec.code },
      update: { deanId: deanUser.id },
      create: {
        name: fSpec.name,
        code: fSpec.code,
        deanId: deanUser.id,
      },
    });
    faculties.push(faculty);

    // Create/Update Dean Profile
    await prisma.deanProfile.upsert({
        where: { userId: deanUser.id },
        update: { facultyId: faculty.id },
        create: { userId: deanUser.id, facultyId: faculty.id }
    });

    // One faculty administrator on Computing (FC) for RBAC demos
    if (fSpec.code === 'FC') {
      const faUser = await prisma.user.upsert({
        where: { email: 'faculty.admin@university.edu' },
        update: {
          full_name: 'Faculty Administrator (Computing)',
          number: 'FA-FC-001',
          roleId: roleMap['FACULTY_ADMIN'],
        },
        create: {
          full_name: 'Faculty Administrator (Computing)',
          email: 'faculty.admin@university.edu',
          number: 'FA-FC-001',
          password_hash: hashedPassword,
          roleId: roleMap['FACULTY_ADMIN'],
        },
      });
      await prisma.facultyAdminProfile.upsert({
        where: { user_id: faUser.id },
        update: { faculty_id: faculty.id },
        create: { user_id: faUser.id, faculty_id: faculty.id },
      });
    }

    for (const dSpec of fSpec.departments) {
      const dept = await prisma.department.upsert({
        where: { code: dSpec.code },
        update: { name: dSpec.name, facultyId: faculty.id },
        create: {
          name: dSpec.name,
          code: dSpec.code,
          facultyId: faculty.id,
        },
      });
      departments.push(dept);
    }
  }

  // --- 4. Programs & Batches & Sections ---
  console.log('Seeding Programs, Batches & Sections...');
  const programs = [];
  const batches = [];
  const sections = [];

  for (const dept of departments) {
    // 1 Program per department
    const progCode = `BSC-${dept.code}`;
    const prog = await prisma.program.upsert({
      where: { code: progCode },
      update: { name: `BSc ${dept.name.replace('Department of ', '')}`, departmentId: dept.id },
      create: {
        name: `BSc ${dept.name.replace('Department of ', '')}`,
        code: progCode,
        level: 'UNDERGRADUATE',
        departmentId: dept.id,
      },
    });
    programs.push(prog);

    // 5 Batches per program (instead of 4)
    for (let i = 1; i <= 5; i++) {
        const ayIndex = (i - 1) % academicYears.length;
        const ay = academicYears[ayIndex];
        const batchName = `${prog.code}-B${i}`;
        
        // Find or create batch
        let batch = await prisma.batch.findFirst({
            where: { name: batchName, programId: prog.id }
        });

        if (!batch) {
            batch = await prisma.batch.create({
                data: {
                    name: batchName,
                    academic_year: parseInt(ay.name.split('/')[0]),
                    programId: prog.id,
                    academicYearId: ay.id,
                    semester_number: 1,
                }
            });
        }
        batches.push(batch);

        // 2 Sections per batch
        for (const secName of ['Section A', 'Section B']) {
            const section = await prisma.batchSection.upsert({
                where: {
                    batchId_name: {
                        batchId: batch.id,
                        name: secName
                    }
                },
                update: {},
                create: {
                    name: secName,
                    batchId: batch.id,
                }
            });
            sections.push(section);
        }
    }
  }

  // --- 5. Lecturers & Courses ---
  console.log('Seeding Lecturers & Courses...');
  const courses = [];
  const lecturers = [];

  for (const dept of departments) {
    // Create 2 Lecturers per department
    for (let i = 1; i <= 2; i++) {
        const email = `lecturer.${dept.code.toLowerCase()}${i}@university.edu`;
        const lecturerUser = await prisma.user.upsert({
            where: { email },
            update: { full_name: `Prof. ${dept.code} Lecturer ${i}` },
            create: {
                full_name: `Prof. ${dept.code} Lecturer ${i}`,
                email,
                number: `LECT-${dept.code}-${i}`,
                password_hash: hashedPassword,
                roleId: roleMap['TEACHER'],
                lecturerProfile: {
                    create: {
                        specialty: `${dept.name} Specialist`,
                        departmentId: dept.id,
                    }
                }
            },
            include: { lecturerProfile: true }
        });
        lecturers.push(lecturerUser);

        // If lecturer profile was not created (because user existed but profile didn't)
        if (!lecturerUser.lecturerProfile) {
            const lp = await prisma.lecturerProfile.upsert({
                where: { userId: lecturerUser.id },
                update: { departmentId: dept.id },
                create: { userId: lecturerUser.id, specialty: `${dept.name} Specialist`, departmentId: dept.id }
            });
            lecturerUser.lecturerProfile = lp;
        }

        // Faculty affiliation (Many-to-many)
        await prisma.lecturerFaculty.upsert({
            where: {
                lecturerProfileId_facultyId: {
                    lecturerProfileId: lecturerUser.lecturerProfile.id,
                    facultyId: dept.facultyId
                }
            },
            update: {},
            create: {
                lecturerProfileId: lecturerUser.lecturerProfile.id,
                facultyId: dept.facultyId
            }
        });
    }

    // Create 4 courses per department
    for (let i = 1; i <= 4; i++) {
        const courseCode = `${dept.code}${100 + i}`;
        const course = await prisma.course.upsert({
            where: { code: courseCode },
            update: { name: `${dept.name.split(' ').pop()} Course ${i}` },
            create: {
                name: `${dept.name.split(' ').pop()} Course ${i}`,
                code: courseCode,
                description: `Introduction to ${dept.name} Part ${i}`,
                credits: 3,
                departmentId: dept.id,
            }
        });
        courses.push(course);
    }
  }

  // --- 6. Students --- 10 per section ---
  console.log('Seeding Students (10 per section)...');
  for (const batch of batches) {
      const batchSections = sections.filter(s => s.batchId === batch.id);
      const program = programs.find(p => p.id === batch.programId);
      const department = departments.find(d => d.id === program.departmentId);

      for (const section of batchSections) {
          // e.g. "section-a", "section-b"
          const sectionSlug = section.name.toLowerCase().replace(/\s+/g, '-');

          for (let i = 1; i <= 10; i++) {
              const email = `student.${batch.name.toLowerCase()}.${sectionSlug}.${i}@university.edu`;
              const studentNum = `STD-${batch.name}-${sectionSlug}-${i.toString().padStart(2, '0')}`;

              const student = await prisma.user.upsert({
                  where: { email },
                  update: { full_name: `Student ${i} (${section.name}, ${batch.name})` },
                  create: {
                      full_name: `Student ${i} (${section.name}, ${batch.name})`,
                      email,
                      number: studentNum,
                      password_hash: hashedPassword,
                      roleId: roleMap['STUDENT'],
                      studentProfile: {
                          create: {
                              student_number: studentNum,
                              admission_year: batch.academic_year,
                              facultyId: department.facultyId,
                              departmentId: department.id,
                              programId: program.id,
                          }
                      }
                  },
                  include: { studentProfile: true }
              });

              // Ensure student profile exists
              if (!student.studentProfile) {
                  await prisma.studentProfile.upsert({
                      where: { userId: student.id },
                      update: {
                          facultyId: department.facultyId,
                          departmentId: department.id,
                          programId: program.id,
                          admission_year: batch.academic_year
                      },
                      create: {
                          userId: student.id,
                          student_number: studentNum,
                          admission_year: batch.academic_year,
                          facultyId: department.facultyId,
                          departmentId: department.id,
                          programId: program.id,
                      }
                  });
              }

              // Register student in their specific section
              const registrationYear = batch.academicYearId;
              const currentSem = semestersAll.find(s => s.academicYearId === batch.academicYearId && s.sequence === 1);

              const existingReg = await prisma.studentRegistration.findFirst({
                  where: { studentId: student.id, batchSectionId: section.id }
              });

              if (!existingReg) {
                  await prisma.studentRegistration.create({
                      data: {
                          studentId: student.id,
                          batchSectionId: section.id,
                          registrationAcademicYearId: registrationYear,
                          currentAcademicYearId: registrationYear,
                          currentSemesterId: currentSem.id
                      }
                  });
              }
          }
      }
  }

  // --- 7. Course Offerings & Teacher Assignments ---
  console.log('Seeding Course Offerings & Teacher Assignments...');
  const teacherLoad = new Map();
  for (const section of sections) {
      const batch = batches.find(b => b.id === section.batchId);
      const program = programs.find(p => p.id === batch.programId);
      const deptCourses = courses.filter(c => c.departmentId === program.departmentId);
      const deptLecturers = lecturers.filter(l => l.lecturerProfile.departmentId === program.departmentId);

      const ayId = batch.academicYearId;
      const sem1 = semestersAll.find(s => s.academicYearId === ayId && s.sequence === 1);
      const sem2 = semestersAll.find(s => s.academicYearId === ayId && s.sequence === 2);

      const sem1Courses = deptCourses.slice(0, 2);
      const sem2Courses = deptCourses.slice(2, 4);

      const assignCourses = async (courseList, semId) => {
          for (const course of courseList) {
              const lecturer = deptLecturers[courseList.indexOf(course) % deptLecturers.length];
              const currentLoad = teacherLoad.get(lecturer.id) || 0;
              const assignedTeacherId = currentLoad < 3 ? lecturer.id : null;

              if (assignedTeacherId) {
                  teacherLoad.set(lecturer.id, currentLoad + 1);
              }

              const offering = await prisma.courseOffering.upsert({
                  where: {
                      courseId_sectionId_semesterId_academicYearId: {
                          courseId: course.id,
                          sectionId: section.id,
                          semesterId: semId,
                          academicYearId: ayId,
                      }
                  },
                  update: {
                      teacherId: assignedTeacherId
                  },
                  create: {
                      courseId: course.id,
                      sectionId: section.id,
                      semesterId: semId,
                      academicYearId: ayId,
                      teacherId: assignedTeacherId
                  }
              });

              if (assignedTeacherId) {
                  await prisma.teacherAssigning.upsert({
                  where: {
                      teacherId_courseId: {
                          teacherId: lecturer.id,
                          courseId: course.id
                      }
                  },
                  update: {},
                  create: {
                      teacherId: lecturer.id,
                      courseId: course.id
                  }
              });
              }

              // --- NEW: Seeding Schedules, Assignments, Quizzes ---
              // Add a schedule if none exists
              const existingSchedule = await prisma.classSchedule.findFirst({
                  where: { courseOfferingId: offering.id }
              });

              if (!existingSchedule) {
                  await prisma.classSchedule.create({
                      data: {
                          day_of_week: (offering.id % 5) + 1, // Mon-Fri
                          start_time: "10:00 AM",
                          end_time: "11:30 AM",
                          location: "Lab 4",
                          topic: `Advanced ${course.name} Topics`,
                          courseOfferingId: offering.id
                      }
                  });
              }

              // Add some assignments
              const existingAssignment = await prisma.assignment.findFirst({
                  where: { courseOfferingId: offering.id }
              });

              if (!existingAssignment) {
                  const asgn = await prisma.assignment.create({
                      data: {
                          title: `Assignment 1: ${course.name} Implementation`,
                          description: "Implement the core concepts discussed in class.",
                          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                          courseOfferingId: offering.id,
                          is_draft: false
                      }
                  });

                  // Add some pending submissions for testing
                  const batchStudents = await prisma.user.findMany({
                      where: {
                          studentRegistrations: {
                              some: { batchSectionId: section.id }
                          }
                      },
                      take: 5
                  });

                  for (const student of batchStudents) {
                      await prisma.submission.create({
                          data: {
                              assignmentId: asgn.id,
                              studentId: student.id,
                              content_url: "https://university.edu/submissions/s1.pdf",
                              is_reviewed: false
                          }
                      });
                  }
              }

              // Add a quiz
              const existingQuiz = await prisma.quiz.findFirst({
                  where: { courseOfferingId: offering.id }
              });

              if (!existingQuiz) {
                  await prisma.quiz.create({
                      data: {
                          title: `${course.name} Midterm Quiz`,
                          duration_minutes: 60,
                          courseOfferingId: offering.id,
                          is_draft: true // Some drafts for status pills
                      }
                  });
              }
          }
      };

      await assignCourses(sem1Courses, sem1.id);
      await assignCourses(sem2Courses, sem2.id);
  }

  // --- 8. Discussion (groups, memberships, hybrid channels) for Chat /dashboard/chat ---
  console.log('Seeding Discussion module (Chat)…');
  try {
    const discussionOut = await runFullDiscussionSetup(prisma);
    console.log(
      'Discussion setup done:',
      JSON.stringify(
        discussionOut,
        (_, v) => (typeof v === 'bigint' ? v.toString() : v),
        0
      )
    );
  } catch (e) {
    console.error('Discussion setup failed (academic seed may still be OK):', e?.message || e);
    throw e;
  }

  try {
    await seedClubVocabulary();
    console.log('Club vocabulary seeded (interest tags + quota policy).');
  } catch (e) {
    console.error('Club vocabulary seed failed:', e?.message || e);
    throw e;
  }

  console.log('--- Seeding Completed Successfully ---');
}

// ─────────────────────────────────────────────────────────────────────────────
// Clubs feature — seed vocabulary (interest tags + quota singleton).
// Default clubs themselves are created lazily by an admin tool or test fixture
// — they need the seedClubSystemRoles helper, which keeps the seed file focused
// on data rather than provisioning logic.
// ─────────────────────────────────────────────────────────────────────────────

const INTEREST_TAG_SEEDS = [
  // Academic
  { slug: 'mathematics',      label: 'Mathematics',        category: 'Academic' },
  { slug: 'physics',          label: 'Physics',            category: 'Academic' },
  { slug: 'chemistry',        label: 'Chemistry',          category: 'Academic' },
  { slug: 'biology',          label: 'Biology',            category: 'Academic' },
  { slug: 'literature',       label: 'Literature',         category: 'Academic' },
  { slug: 'history',          label: 'History',            category: 'Academic' },
  { slug: 'philosophy',       label: 'Philosophy',         category: 'Academic' },
  { slug: 'economics',        label: 'Economics',          category: 'Academic' },

  // Tech
  { slug: 'programming',      label: 'Programming',        category: 'Technology' },
  { slug: 'web-development',  label: 'Web Development',    category: 'Technology' },
  { slug: 'ai-ml',            label: 'AI & Machine Learning', category: 'Technology' },
  { slug: 'cybersecurity',    label: 'Cybersecurity',      category: 'Technology' },
  { slug: 'data-science',     label: 'Data Science',       category: 'Technology' },
  { slug: 'robotics',         label: 'Robotics',           category: 'Technology' },
  { slug: 'game-dev',         label: 'Game Development',   category: 'Technology' },

  // Arts & culture
  { slug: 'music',            label: 'Music',              category: 'Arts' },
  { slug: 'photography',      label: 'Photography',        category: 'Arts' },
  { slug: 'film',             label: 'Film & Video',       category: 'Arts' },
  { slug: 'creative-writing', label: 'Creative Writing',   category: 'Arts' },
  { slug: 'design',           label: 'Design',             category: 'Arts' },

  // Sports & wellness
  { slug: 'football',         label: 'Football',           category: 'Sports' },
  { slug: 'basketball',       label: 'Basketball',         category: 'Sports' },
  { slug: 'fitness',          label: 'Fitness',            category: 'Sports' },
  { slug: 'chess',            label: 'Chess',              category: 'Sports' },

  // Community
  { slug: 'debate',           label: 'Debate',             category: 'Community' },
  { slug: 'volunteering',     label: 'Volunteering',       category: 'Community' },
  { slug: 'public-speaking',  label: 'Public Speaking',    category: 'Community' },
  { slug: 'entrepreneurship', label: 'Entrepreneurship',   category: 'Community' },
  { slug: 'languages',        label: 'Languages',          category: 'Community' },
  { slug: 'gaming',           label: 'Gaming',             category: 'Community' },
  { slug: 'reading',          label: 'Reading',            category: 'Community' },
];

async function seedClubVocabulary() {
  // Singleton policy row at id=1. Idempotent — keeps the row's current caps if
  // someone tuned them via the admin UI between deploys.
  await prisma.clubQuotaPolicy.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, perUserActiveCap: 2, perUserPendingCap: 1 },
  });

  for (const tag of INTEREST_TAG_SEEDS) {
    await prisma.interestTag.upsert({
      where: { slug: tag.slug },
      update: { label: tag.label, category: tag.category },
      create: { slug: tag.slug, label: tag.label, category: tag.category },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });