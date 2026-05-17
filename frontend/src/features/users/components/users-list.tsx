'use client';

import React from 'react';
import { useUsers } from '../api/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ROLE_MAP: Record<number | string, string> = {
  1: 'SUPER_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  2: 'DEAN',
  DEAN: 'DEAN',
  3: 'TEACHER',
  TEACHER: 'TEACHER',
  4: 'STUDENT',
  STUDENT: 'STUDENT'
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'text-purple-600 border-purple-200 bg-purple-50',
  DEAN: 'text-blue-600 border-blue-200 bg-blue-50',
  TEACHER: 'text-amber-600 border-amber-200 bg-amber-50',
  STUDENT: 'text-green-600 border-green-200 bg-green-50'
};

export const UsersList = () => {
  const { data, isLoading, error } = useUsers();

  if (isLoading)
    return (
      <div className='p-8 text-center text-muted-foreground animate-pulse'>Loading users...</div>
    );
  if (error)
    return (
      <div className='p-8 text-center text-red-500'>
        Error loading users: {(error as Error).message}
      </div>
    );

  const users = Array.isArray(data) ? data : [];

  return (
    <div className='rounded-xl border bg-background overflow-hidden'>
      <table className='w-full text-sm'>
        <thead className='bg-muted/50 border-b'>
          <tr className='text-muted-foreground uppercase text-xs tracking-wider'>
            <th className='px-6 py-4 text-left font-semibold'>User Details</th>
            <th className='px-6 py-4 text-left font-semibold'>Email Address</th>
            <th className='px-6 py-4 text-center font-semibold'>Role</th>
            <th className='px-6 py-4 text-right font-semibold'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => {
            const roleName = ROLE_MAP[u.roleId] || u.role || 'N/A';
            const roleStyle = ROLE_STYLES[roleName] || 'text-gray-500 border-gray-200 bg-gray-50';

            return (
              <tr key={u.id} className='border-b last:border-0 hover:bg-muted/40 transition-colors'>
                <td className='px-6 py-4'>
                  <div className='flex flex-col'>
                    <span className='font-medium text-foreground'>{u.full_name}</span>
                    <span className='text-xs text-muted-foreground italic'>ID: #{u.id}</span>
                  </div>
                </td>
                <td className='px-6 py-4 text-muted-foreground font-mono text-xs'>{u.email}</td>
                <td className='px-6 py-4 text-center'>
                  <Badge
                    variant='outline'
                    className={`${roleStyle} font-bold px-2.5 py-0.5 rounded-full`}
                  >
                    {roleName}
                  </Badge>
                </td>
                <td className='px-6 py-4 text-right space-x-1'>
                  <Button variant='ghost' size='sm' className='h-8 px-2'>
                    Edit
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50'
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className='text-center py-16 text-muted-foreground italic'>
                No users found in the academic system.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className='bg-muted/20 px-6 py-3 border-t flex items-center justify-between'>
        <span className='text-xs text-muted-foreground'>
          Showing <span className='font-semibold text-foreground'>{users.length}</span> active
          academic accounts
        </span>
        <Button variant='outline' size='sm' className='text-xs h-7'>
          Export List
        </Button>
      </div>
    </div>
  );
};
