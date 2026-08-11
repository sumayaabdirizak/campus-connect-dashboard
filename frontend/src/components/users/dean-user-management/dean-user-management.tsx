'use client';

import { useState } from 'react';
import { useQuery } from '@/lib/async-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs';
import { fetchUsersByRole } from '@/lib/users/services/dean-service';
import { LecturersTab } from './lecturers-tab';
import { StudentsTab } from './students-tab';
import { asDeanUserRows, filterUsersBySearch } from './types';
import { UserManagementHeader } from './user-management-header';

export default function DeanUserManagement() {
  const [activeTab, setActiveTab] = useState('students');
  const [search, setSearch] = useState('');

  const { data: lecturers, isLoading: loadingLecturers } = useQuery({
    queryKey: ['users', 'TEACHER'],
    queryFn: () => fetchUsersByRole('TEACHER'),
  });

  const { data: allStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ['users', 'STUDENT'],
    queryFn: () => fetchUsersByRole('STUDENT'),
  });

  const { data: unassignedResponse, isLoading: loadingUnassigned } = useQuery({
    queryKey: ['users', 'STUDENT', 'unassigned'],
    queryFn: () => fetchUsersByRole('STUDENT', true),
  });

  const filteredStudents = filterUsersBySearch(
    asDeanUserRows(allStudents?.users),
    search
  );
  const filteredLecturers = filterUsersBySearch(
    asDeanUserRows(lecturers?.users),
    search
  );
  const unassignedStudents = asDeanUserRows(unassignedResponse?.users);

  return (
    <div className='space-y-6'>
      <UserManagementHeader search={search} onSearchChange={setSearch} />

      <Tabs defaultValue='students' value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full max-w-[400px] grid-cols-2'>
          <TabsTrigger value='students'>Students</TabsTrigger>
          <TabsTrigger value='lecturers'>Lecturers</TabsTrigger>
        </TabsList>

        <TabsContent value='students' className='space-y-4'>
          <StudentsTab
            filteredStudents={filteredStudents}
            unassignedStudents={unassignedStudents}
            totalCount={allStudents?.users.length || 0}
            unassignedCount={unassignedResponse?.users.length || 0}
            loadingStudents={loadingStudents}
            loadingUnassigned={loadingUnassigned}
          />
        </TabsContent>

        <TabsContent value='lecturers'>
          <LecturersTab
            lecturers={filteredLecturers}
            isLoading={loadingLecturers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
