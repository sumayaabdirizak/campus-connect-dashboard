import { PrismaClient } from '@prisma/client';
const { PrismaClient: PrismaClient2 } = await import('@prisma/client');
const p = new PrismaClient2.PrismaClient();

const {
  faculty,
  department,
  program,
  batch,
  batchSection,
  course,
  user,
  courseOffering,
  studentRegistration
} = p;

const [faculties, departments, programs, batches, sections, courses, students, teachers, offerings, registrations] = await Promise.all([
  faculty.count(),
  department.count(),
  program.count(),
  batch.count(),
  batchSection.count(),
  course.count(),
  user.count({ where: { role: { name: 'STUDENT' } } }),
  user.count({ where: { role: { name: 'TEACHER' } } }),
  courseOffering.count(),
  studentRegistration.count()
]);

console.log('\n========== SEEDED DATA SUMMARY ==========\n');
console.log('Faculties:            ', faculties);
console.log('Departments:         ', departments);
console.log('Programs:           ', programs);
console.log('Batches:             ', batches);
console.log('Sections:           ', sections);
console.log('Courses:            ', courses);
console.log('Students:           ', students);
console.log('Teachers:           ', teachers);
console.log('Course Offerings:   ', offerings);
console.log('Student Registrations:', registrations);
console.log('\n============================================\n');

p.$disconnect();