'use client'

export interface StudentCourseListProps {
  courses: unknown[];
  isLoading: boolean;
}

export function StudentCourseList({ courses, isLoading }: StudentCourseListProps) {
  return <div className="p-4">Student Course List</div>
}
export default StudentCourseList
