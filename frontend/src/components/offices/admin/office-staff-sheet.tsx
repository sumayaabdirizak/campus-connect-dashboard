'use client';

import Link from 'next/link';
import { Label } from '@/features/ui/components/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/features/ui/components/sheet';
import { useOfficeStaff } from '@/lib/offices/queries';
import type { SupportOffice } from '@/lib/offices/types';
import { OfficeStaffAdd } from './office-staff-add';
import { OfficeStaffList } from './office-staff-list';

export function OfficeStaffSheet({
  office,
  onOpenChange
}: {
  office: SupportOffice | null;
  onOpenChange: (open: boolean) => void;
}) {
  const officeId = office?.id ?? null;
  const { data: staff = [], isLoading } = useOfficeStaff(officeId);

  return (
    <Sheet open={office != null} onOpenChange={onOpenChange}>
      <SheetContent className='flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>{office?.name ?? 'Office'} staff</SheetTitle>
          <SheetDescription>
            Assign who can reply for this office in Messages. Prefer users with the Office Staff
            role — create them under{' '}
            <Link href='/dashboard/users' className='text-foreground font-medium underline-offset-2 hover:underline'>
              Users
            </Link>
            .
          </SheetDescription>
        </SheetHeader>
        <div className='space-y-2'>
          <Label>Current staff</Label>
          {officeId != null ? (
            <OfficeStaffList officeId={officeId} staff={staff} isLoading={isLoading} />
          ) : null}
        </div>
        {officeId != null ? <OfficeStaffAdd officeId={officeId} staff={staff} /> : null}
      </SheetContent>
    </Sheet>
  );
}
