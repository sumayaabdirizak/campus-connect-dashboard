'use client';

import { GraduationCap } from 'lucide-react';
import type { ProfileMe } from '@/lib/profile/services';
import { ProfileReadOnlyField } from './profile-read-only-field';
import { ProfileSectionHeading } from './profile-section-heading';

function unitLabel(u?: { name?: string; code?: string | null } | null) {
  if (!u?.name) return null;
  return u.code ? `${u.name} (${u.code})` : u.name;
}

export function ProfileAcademicCard({ profile }: { profile: ProfileMe }) {
  const rows: { label: string; value: string }[] = [];

  if (profile.studentProfile) {
    const sp = profile.studentProfile;
    const faculty = unitLabel(sp.faculty);
    const dept = unitLabel(sp.department);
    const program = unitLabel(sp.program);
    if (faculty) rows.push({ label: 'Faculty', value: faculty });
    if (dept) rows.push({ label: 'Department', value: dept });
    if (program) rows.push({ label: 'Program', value: program });
    if (sp.student_number) rows.push({ label: 'Student number', value: sp.student_number });
    if (sp.semester_label) {
      rows.push({ label: 'Semester', value: sp.semester_label });
    } else if (sp.batch_semester_number != null && sp.batch_semester_number > 0) {
      rows.push({ label: 'Semester', value: `Semester ${sp.batch_semester_number}` });
    }
    if (sp.admission_year) {
      rows.push({ label: 'Admission year', value: String(sp.admission_year) });
    }
  } else if (profile.lecturerProfile) {
    const lp = profile.lecturerProfile;
    const dept = unitLabel(lp.department);
    if (dept) rows.push({ label: 'Department', value: dept });
    if (profile.faculties?.length) {
      rows.push({
        label: 'Faculties',
        value: profile.faculties.map((f) => f.name).join(', '),
      });
    }
    if (lp.specialty?.trim()) {
      rows.push({ label: 'Specialty', value: lp.specialty.trim() });
    }
  } else if (profile.deanProfile) {
    const faculty = unitLabel(profile.deanProfile.faculty);
    if (faculty) rows.push({ label: 'Faculty', value: faculty });
  }

  return (
    <section className='rounded-xl border border-border bg-card p-4 sm:p-5'>
      <ProfileSectionHeading icon={GraduationCap} title='Academic Information' />
      {rows.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No academic affiliation on this account.</p>
      ) : (
        <div className='grid gap-3 sm:grid-cols-2'>
          {rows.map((r) => (
            <ProfileReadOnlyField key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      )}
    </section>
  );
}
