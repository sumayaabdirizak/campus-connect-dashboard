'use client'

export interface CourseResourcesProps {
  courseId: string;
  isStudent: boolean;
}

export function Courseresources({ courseId, isStudent }: CourseResourcesProps) {
  return <div className="p-4">Courseresources</div>
}

export default Courseresources
