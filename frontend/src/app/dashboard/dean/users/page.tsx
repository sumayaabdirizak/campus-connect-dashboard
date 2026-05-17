'use client';

import { useState } from 'react';
import {
  useDeanUsers,
  useRemoveDeanUser,
  useUpdateDeanUser,
  usePendingRegistrations,
  useApproveRegistration,
  useRejectRegistration
} from '@/features/dean/api/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Users,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  UserCheck,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import PageContainer from '@/components/layout/page-container';

// ── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    ACTIVE: 'default',
    INACTIVE: 'secondary',
    SUSPENDED: 'destructive'
  };
  return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}

// ── Role Badge ──────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    STUDENT: 'bg-blue-100 text-blue-800',
    TEACHER: 'bg-purple-100 text-purple-800',
    DEAN: 'bg-amber-100 text-amber-800',
    SUPER_ADMIN: 'bg-red-100 text-red-800'
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[role] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {role}
    </span>
  );
}

// ── Pending Registrations Tab ───────────────────────────────────────────────
function PendingRegistrationsTab() {
  const { data, isLoading } = usePendingRegistrations();
  const approve = useApproveRegistration();
  const reject = useRejectRegistration();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject'>('approve');

  const registrations = data?.registrations ?? [];

  const handleConfirm = () => {
    if (!confirmId) return;
    if (confirmAction === 'approve') approve.mutate(confirmId);
    else reject.mutate(confirmId);
    setConfirmId(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Clock className='h-5 w-5 text-amber-500' />
            Pending Registrations
            {registrations.length > 0 && (
              <Badge variant='secondary' className='ml-1'>
                {registrations.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and approve or reject new student and lecturer registrations in your faculty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-muted-foreground py-8 text-center text-sm'>Loading...</p>
          ) : registrations.length === 0 ? (
            <div className='py-12 text-center'>
              <CheckCircle className='text-muted-foreground mx-auto mb-2 h-10 w-10' />
              <p className='text-muted-foreground text-sm'>No pending registrations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>{user.full_name}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>{user.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className='font-mono text-sm'>{user.number}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {new Date((user as any).created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-green-600 hover:bg-green-50 hover:text-green-700'
                          onClick={() => {
                            setConfirmId(user.id);
                            setConfirmAction('approve');
                          }}
                        >
                          <CheckCircle className='mr-1 h-4 w-4' /> Approve
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-red-600 hover:bg-red-50 hover:text-red-700'
                          onClick={() => {
                            setConfirmId(user.id);
                            setConfirmAction('reject');
                          }}
                        >
                          <XCircle className='mr-1 h-4 w-4' /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' ? 'Approve Registration?' : 'Reject Registration?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve'
                ? 'The user will be set to ACTIVE and can log in immediately.'
                : 'The user will be SUSPENDED and blocked from accessing the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmAction === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── All Users Tab ───────────────────────────────────────────────────────────
function AllUsersTab() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const params: Record<string, string> = { limit: '200' };
  if (search) params.search = search;
  if (role) params.role = role;

  const { data, isLoading } = useDeanUsers(params);
  const removeUser = useRemoveDeanUser();

  const users = data?.users ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' /> Faculty Members
          </CardTitle>
          <CardDescription>All students and staff in your faculty.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Filters */}
          <div className='flex gap-3'>
            <div className='relative flex-1'>
              <Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
              <Input
                placeholder='Search name, email or ID...'
                className='pl-9'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={role || 'ALL'} onValueChange={(v) => setRole(v === 'ALL' ? '' : v)}>
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='All Roles' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>All Roles</SelectItem>
                <SelectItem value='STUDENT'>Students</SelectItem>
                <SelectItem value='TEACHER'>Teachers</SelectItem>
                <SelectItem value='DEAN'>Deans</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <p className='text-muted-foreground py-8 text-center text-sm'>Loading...</p>
          ) : users.length === 0 ? (
            <div className='py-12 text-center'>
              <Users className='text-muted-foreground mx-auto mb-2 h-10 w-10' />
              <p className='text-muted-foreground text-sm'>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='w-12' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>{user.full_name}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>{user.email}</TableCell>
                    <TableCell className='font-mono text-sm'>{user.number}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon' className='h-8 w-8'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            className='text-red-600 focus:text-red-600'
                            onClick={() => setDeleteId(user.id)}
                          >
                            <Trash2 className='mr-2 h-4 w-4' /> Remove User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the user from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 hover:bg-red-700'
              onClick={() => {
                if (deleteId) removeUser.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DeanUsersPage() {
  const { data: pending } = usePendingRegistrations();
  const pendingCount = pending?.registrations?.length ?? 0;

  const { data: membersTotal } = useDeanUsers({ limit: '1' });
  const { data: teachersTotal } = useDeanUsers({ role: 'TEACHER', limit: '1' });
  const totalMembers = membersTotal?.pagination?.total;
  const teacherMembers = teachersTotal?.pagination?.total;

  return (
    <PageContainer>
      <div className='space-y-6'>
        {/* Header */}
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>User Management</h1>
          <p className='text-muted-foreground'>
            Manage students, lecturers, and registrations in your faculty.
          </p>
        </div>

        {/* Stats Row */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-blue-100 p-3'>
                <GraduationCap className='h-5 w-5 text-blue-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Total Members</p>
                <p className='text-2xl font-bold'>
                  {totalMembers != null ? totalMembers : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-purple-100 p-3'>
                <BookOpen className='h-5 w-5 text-purple-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Teachers</p>
                <p className='text-2xl font-bold'>
                  {teacherMembers != null ? teacherMembers : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-amber-100 p-3'>
                <UserCheck className='h-5 w-5 text-amber-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Pending Requests</p>
                <p className='text-2xl font-bold'>{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={pendingCount > 0 ? 'pending' : 'all'}>
          <TabsList>
            <TabsTrigger value='all'>All Members</TabsTrigger>
            <TabsTrigger value='pending' className='relative'>
              Pending
              {pendingCount > 0 && (
                <span className='ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white'>
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value='all' className='mt-4'>
            <AllUsersTab />
          </TabsContent>
          <TabsContent value='pending' className='mt-4'>
            <PendingRegistrationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
