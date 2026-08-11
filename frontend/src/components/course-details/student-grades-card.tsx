'use client'

interface StudentGradesCardProps {
  courseId: string;
}

export function StudentGradesCard({ courseId }: StudentGradesCardProps) {
  return <div className="p-4">Student Grades for {courseId}</div>
}

export default StudentGradesCard
