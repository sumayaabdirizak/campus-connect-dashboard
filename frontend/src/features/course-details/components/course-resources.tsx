'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, FileText, Download, Trash2, MoreVertical, Upload, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
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

interface CourseResourcesProps {
  courseId: string;
  isStudent?: boolean;
}

const resources = [
  {
    id: 'r1',
    fileName: 'Lecture_Notes_Week_1.pdf',
    fileType: 'PDF',
    size: '1.2 MB',
    uploadedAt: new Date(Date.now() - 86400000 * 5),
    status: 'approved',
    uploadedBy: 'Dr. Sarah'
  },
  {
    id: 'r2',
    fileName: 'Database_Schema.sql',
    fileType: 'SQL',
    size: '24 KB',
    uploadedAt: new Date(Date.now() - 86400000 * 3),
    status: 'approved',
    uploadedBy: 'Dr. Sarah'
  },
  {
    id: 'r3',
    fileName: 'Slides_Week_2.pptx',
    fileType: 'PPTX',
    size: '5.4 MB',
    uploadedAt: new Date(Date.now() - 86400000),
    status: 'approved',
    uploadedBy: 'Dr. Sarah'
  },
  {
    id: 'r4',
    fileName: 'Lecture_Notes_Week_3.pdf',
    fileType: 'PDF',
    size: '2.1 MB',
    uploadedAt: new Date(Date.now() - 3600000),
    status: 'pending',
    uploadedBy: 'Dr. Sarah'
  }
];

export function CourseResources({ courseId, isStudent }: CourseResourcesProps) {
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = resources.filter((r) => r.fileName.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = (id: string) => {
    toast.success('Resource deleted');
    setDeleteId(null);
  };

  if (isStudent) {
    return (
      <div className='space-y-4'>
        <Input
          placeholder='Search...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='max-w-xs'
        />
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
          {filtered
            .filter((r) => r.status === 'approved')
            .map((r) => (
              <div key={r.id} className='border rounded-lg p-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <FileText className='w-8 h-8' />
                  <Badge>{r.fileType}</Badge>
                </div>
                <p className='font-medium mb-1'>{r.fileName}</p>
                <p className='text-xs text-muted-foreground'>{r.size}</p>
                <Button variant='outline' className='w-full mt-3 gap-1'>
                  <Download className='w-4 h-4' /> Download
                </Button>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <Input
          placeholder='Search...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='max-w-xs'
        />
        <Button onClick={() => setUploadOpen(true)} className='gap-1'>
          <Upload className='w-4 h-4' /> Upload
        </Button>
      </div>

      <div className='border rounded-lg overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/30'>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className='font-medium'>{r.fileName}</TableCell>
                <TableCell>
                  <Badge variant='outline'>{r.fileType}</Badge>
                </TableCell>
                <TableCell>{r.size}</TableCell>
                <TableCell>{format(r.uploadedAt, 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className='flex gap-1'>
                    <Button variant='ghost' size='icon' className='h-8 w-8'>
                      <Download className='w-4 h-4' />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon' className='h-8 w-8'>
                          <MoreVertical className='w-4 h-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem>
                          <Edit className='w-4 h-4 mr-2' />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='text-destructive'
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className='w-4 h-4 mr-2' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {deleteId && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-background p-6 rounded-lg max-w-sm'>
            <h3 className='font-bold text-lg mb-2'>Delete Resource?</h3>
            <p className='text-sm text-muted-foreground mb-4'>This action cannot be undone.</p>
            <div className='flex gap-2 justify-end'>
              <Button variant='outline' onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant='destructive' onClick={() => handleDelete(deleteId)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
