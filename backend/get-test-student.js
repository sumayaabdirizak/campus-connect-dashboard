import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const student = await prisma.user.findFirst({
    where: {
      role: { name: 'STUDENT' },
      studentRegistrations: {
        some: {
          batchSection: {
            courseOfferings: {
              some: {}
            }
          }
        }
      }
    },
    include: {
      studentRegistrations: {
        include: {
          batchSection: {
            include: {
              courseOfferings: {
                include: {
                  course: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (student) {
    console.log('--- TEST STUDENT ACCOUNT ---');
    console.log('Email:', student.email);
    console.log('Password: password123');
    console.log('Name:', student.full_name);
    console.log('Student Enrollments:');
    student.studentRegistrations.forEach(reg => {
      console.log(`  - Section: ${reg.batchSection.name}`);
      console.log(`    Courses: ${reg.batchSection.courseOfferings.map(o => o.course.code).join(', ')}`);
    });
  } else {
    console.log('No student found with enrolled courses!');
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
