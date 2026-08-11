'use client'

interface CourseChatProps {
  courseId: string;
  isStudent?: boolean;
}

export function CourseChat({ courseId, isStudent }: CourseChatProps) {
  return <div className="p-4">Course Chat for {courseId}</div>
}

export default CourseChat
