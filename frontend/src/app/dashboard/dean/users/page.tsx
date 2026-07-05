'use client';

import { useState } from 'react';
import { useDeanUsers } from '@/features/dean/api/queries';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Users, Search } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    INACTIVE: 'secondary',
    SUSPENDED: 'destructive'
  };
  return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    STUDENT: 'bg-blue-100 text-blue-800',
    TEACHER: 'bg-purple-100 text-purple-800',
    DEAN: 'bg-amber-100 text-amber-800',
    SUPER_ADMIN: 'bg-red-100 text-red-800'
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[role] ?? 'bg-gray-100 text-gray-800'}`}>
      {role}
    </span>
  );
}

export default function DeanUsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  const params: Record<string, string> = { limit: '200' };
  if (search) params.search = search;
  if (role) params.role = role;

  const { data, isLoading } = useDeanUsers(params);
  const hasActiveFilter = Boolean(search || role);

  const users = data?.users ?? [];

  return (
    <PageContainer fill>
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden'>
        <div className='shrink-0'>
          <h1 className='text-2xl font-bold tracking-tight'>Faculty Members</h1>
          <p className='text-muted-foreground'>Students and staff in your faculty.</p>
        </div>

        <Card className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <CardHeader className='shrink-0 pb-3'>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' /> Members
            </CardTitle>
            <CardDescription>All students and staff in your faculty.</CardDescription>
          </CardHeader>
          <CardContent className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pb-4'>
            <div className='flex shrink-0 flex-col gap-3 sm:flex-row'>
              <div className='relative min-w-0 flex-1'>
                <Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
                <Input
                  placeholder='Search name, email or ID...'
                  className='pl-9'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={role || 'ALL'} onValueChange={(v) => setRole(v === 'ALL' ? '' : v)}>
                <SelectTrigger className='w-full sm:w-40'>
                  <SelectValue placeholder='All Roles' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>All Roles</SelectItem>
                  <SelectItem value='STUDENT'>Students</SelectItem>
                  <SelectItem value='TEACHER'>Teachers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='relative min-h-0 flex-1 overflow-hidden rounded-md border'>
              {isLoading ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>Loading...</p>
              ) : users.length === 0 ? (
                <div className='py-12 text-center'>
                  <Users className='text-muted-foreground mx-auto mb-2 h-10 w-10 opacity-20' />
                  {hasActiveFilter ? (
                    <>
                      <p className='text-muted-foreground text-sm'>No users match your search</p>
                      <button
                        className='mt-2 text-xs text-primary underline-offset-2 hover:underline'
                        onClick={() => {
                          setSearch('');
                          setRole('');
                        }}
                      >
                        Clear filters
                      </button>
                    </>
                  ) : (
                    <p className='text-muted-foreground text-sm'>No users in your faculty yet</p>
                  )}
                </div>
              ) : (
                <div className='absolute inset-0 overflow-auto'>
                  <Table>
                    <TableHeader className='bg-muted/50 sticky top-0 z-10'>
                      <TableRow>
                        <TableHead className='min-w-[140px]'>Name</TableHead>
                        <TableHead className='min-w-[180px]'>Email</TableHead>
                        <TableHead className='min-w-[100px]'>ID Number</TableHead>
                        <TableHead className='min-w-[90px]'>Role</TableHead>
                        <TableHead className='min-w-[90px]'>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className='max-w-[200px] truncate font-medium'>
                            {user.full_name}
                          </TableCell>
                          <TableCell className='max-w-[240px] truncate text-muted-foreground text-sm'>
                            {user.email}
                          </TableCell>
                          <TableCell className='font-mono text-sm whitespace-nowrap'>
                            {user.number}
                          </TableCell>
                          <TableCell>
                            <RoleBadge role={user.role} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={user.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
