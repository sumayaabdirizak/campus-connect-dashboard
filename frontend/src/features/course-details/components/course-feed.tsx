'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, FileText, MessageSquare, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

interface CourseFeedProps {
  courseId: string;
}

const mockAnnouncements = [
  {
    id: '1',
    title: 'Final Project Requirements',
    content:
      'Please find the attached document for the final project requirements. Deadline is end of May.',
    timestamp: new Date().toISOString(),
    important: true,
    attachments: [{ name: 'project_spec.pdf', size: '1.2 MB' }]
  },
  {
    id: '2',
    title: 'Extra Lab Session',
    content: 'We will have an extra lab session this Friday to cover the midterm material.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    important: false,
    attachments: []
  }
];

export function CourseFeed({ courseId }: CourseFeedProps) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [posts, setPosts] = useState(mockAnnouncements);

  const filtered = posts.filter((p) => {
    if (filter === 'announcements') return p.attachments.length === 0;
    if (filter === 'resources') return p.attachments.length > 0;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => {
    setPosts([
      {
        id: Date.now().toString(),
        title: newTitle,
        content: newContent,
        timestamp: new Date().toISOString(),
        important: false,
        attachments: []
      },
      ...posts
    ]);
    setCreateOpen(false);
    setNewTitle('');
    setNewContent('');
  };

  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <div className='relative flex-1 max-w-xs'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-10'
          />
        </div>
        <div className='flex gap-1 p-1 bg-muted/30 rounded-lg'>
          {['all', 'announcements', 'resources'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-md ${filter === f ? 'bg-background shadow-sm' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button onClick={() => setCreateOpen(true)} size='sm' className='gap-1'>
          <Plus className='w-4 h-4' /> New Post
        </Button>
      </div>

      <div className='space-y-2'>
        {filtered.map((item) => (
          <div key={item.id} className='border rounded-lg p-4 hover:bg-muted/20'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>{item.title}</span>
                {item.important && (
                  <Badge variant='destructive' className='text-[10px]'>
                    Important
                  </Badge>
                )}
              </div>
              <div className='flex gap-1'>
                <Button variant='ghost' size='icon' className='h-8 w-8'>
                  <Edit className='w-4 h-4' />
                </Button>
                <Button variant='ghost' size='icon' className='h-8 w-8 text-destructive'>
                  <Trash2 className='w-4 h-4' />
                </Button>
              </div>
            </div>
            <p className='text-sm text-muted-foreground mb-2'>{item.content}</p>
            <p className='text-xs text-muted-foreground flex items-center gap-1'>
              <Clock className='w-3 h-3' /> {format(new Date(item.timestamp), 'MMM d, yyyy')}
            </p>
            {item.attachments.length > 0 && (
              <div className='mt-2 space-y-1'>
                {item.attachments.map((file, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between p-2 bg-muted/30 rounded text-sm'
                  >
                    <span className='font-medium'>{file.name}</span>
                    <span className='text-xs text-muted-foreground'>{file.size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder='Title'
            />
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder='Content'
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
