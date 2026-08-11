'use client'

export interface CourseQuizzesProps {
  courseId: string;
  isStudent: boolean;
}

export function Coursequizzes({ courseId, isStudent }: CourseQuizzesProps) {
  return <div className="p-4">Coursequizzes</div>
}

export default Coursequizzes
