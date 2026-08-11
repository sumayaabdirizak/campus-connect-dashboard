'use client'

export interface CourseAssignmentsProps {
  courseId: string;
  isStudent: boolean;
}

export function Courseassignments({ courseId, isStudent }: CourseAssignmentsProps) {
  return <div className="p-4">Courseassignments</div>
}

export default Courseassignments
