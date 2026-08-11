'use client'

export interface CourseGroupsProps {
  courseId: string;
  isStudent: boolean;
}

export function Coursegroups({ courseId, isStudent }: CourseGroupsProps) {
  return <div className="p-4">Coursegroups</div>
}

export default Coursegroups
