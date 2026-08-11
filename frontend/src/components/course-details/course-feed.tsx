'use client'

export interface CourseFeedProps {
  courseId: string;
  isStudent: boolean;
}

export function Coursefeed({ courseId, isStudent }: CourseFeedProps) {
  return <div className="p-4">Coursefeed</div>
}

export default Coursefeed
