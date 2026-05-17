import React from 'react';

interface CourseBadgeProps {
  courseName: string;
  courseCode: string;
}

export function CourseBadge({ courseName, courseCode }: CourseBadgeProps) {
  return (
    <div className='text-[13px] text-muted-foreground font-medium uppercase tracking-tight'>
      {courseCode} - {courseName}
    </div>
  );
}
