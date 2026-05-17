'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, FileArchive, FileVideo, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

export default function ResourcesPage() {
  const user = useAuthStore((state) => state.user);
  const isInstructor = user?.role === 'TEACHER' || user?.role === 'DEAN';

  const mockResources = [
    { id: 1, title: 'Introduction to Java.pdf', size: '2.4 MB', type: 'PDF' },
    { id: 2, title: 'Web Frameworks Overview.docx', size: '1.2 MB', type: 'DOCX' },
    { id: 3, title: 'Database Design Lab Guide.zip', size: '5.8 MB', type: 'ZIP' },
    { id: 4, title: 'Security Best Practices.pdf', size: '3.1 MB', type: 'PDF' }
  ];

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>Resources</h2>
          <p className='text-muted-foreground'>Access your course materials and files.</p>
        </div>
        {isInstructor && (
          <Button>
            <Plus className='mr-2 h-4 w-4' /> Upload Resource
          </Button>
        )}
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {mockResources.map((resource) => (
          <Card key={resource.id} className='hover:shadow-md transition-shadow'>
            <CardHeader className='flex flex-col items-center justify-center p-6 bg-muted/20'>
              {resource.type === 'PDF' && <FileVideo className='h-12 w-12 text-red-500 mb-2' />}
              {resource.type === 'DOCX' && <FileText className='h-12 w-12 text-blue-500 mb-2' />}
              {resource.type === 'ZIP' && (
                <FileArchive className='h-12 w-12 text-orange-500 mb-2' />
              )}
              <CardTitle className='text-sm font-bold text-center mt-2 truncate w-full'>
                {resource.title}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-4 flex items-center justify-between'>
              <span className='text-xs text-muted-foreground'>{resource.size}</span>
              <Button variant='ghost' size='icon'>
                <Download className='h-4 w-4 text-muted-foreground hover:text-primary' />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
