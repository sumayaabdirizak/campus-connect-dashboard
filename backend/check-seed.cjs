const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const [faculties, departments, programs, batches, sections, courses, students, teachers, offerings, registrations] = await Promise.all([
    p.faculty.count(),
    p.department.count(),
    p.program.count(),
    p.batch.count(),
    p.batchSection.count(),
    p.course.count(),
    p.user.count({ where: { role: { name: 'STUDENT' } } }),
    p.user.count({ where: { role: { name: 'TEACHER' } } }),
    p.courseOffering.count(),
    p.studentRegistration.count()
  ]);

  console.log('\n========== SEEDED DATA SUMMARY ==========\n');
  console.log('Faculties:          ', faculties);
  console.log('Departments:        ', departments);
  console.log('Programs:          ', programs);
  console.log('Batches:            ', batches);
  console.log('Sections:          ', sections);
  console.log('Courses:           ', courses);
  console.log('Students:          ', students);
  console.log('Teachers:          ', teachers);
  console.log('Course Offerings:  ', offerings);
  console.log('Student Registrations:', registrations);
  console.log('\n============================================\n');

  // Calculate expected values
  console.log('EXPECTED (based on your plan):');
  console.log('- 2 Faculties');
  console.log('- 4 Departments (2 per faculty)');
  console.log('- 20 Batches (4 departments x 5 batches)');
  console.log('- 40 Sections (20 batches x 2 sections)');
  console.log('- 400 Students (40 sections x 10 students)');
  console.log('- 8 Courses (4 departments x 2 courses minimum)');

  p.$disconnect();
})();