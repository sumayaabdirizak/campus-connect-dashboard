'use client';

import { Button } from '@/components/ui/button';
import { Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const mockNotifications = [
  {
    id: 1,
    title: 'New course resource published',
    content: 'Dr. John Smith uploaded a new PDF in Java Fundamentals.',
    actionText: 'View resource',
    time: '15m ago',
    read: false
  },
  {
    id: 2,
    title: 'Assignment deadline approaching',
    content: 'Unit 2: Java Fundamentals assignment is due in 24 hours.',
    actionText: 'View assignment',
    time: '40m ago',
    read: false
  },
  {
    id: 3,
    title: 'Grade released',
    content: 'Your grade for Assignment 1: Basic Concepts has been published.',
    actionText: 'View grade',
    time: '2h ago',
    read: false
  },
  {
    id: 4,
    title: 'Task assigned to you',
    content: 'You have been assigned "Update course syllabus" on the faculty board.',
    actionText: 'Open board',
    time: '1d ago',
    read: true
  },
  {
    id: 5,
    title: 'New message from Dean',
    content: 'Dr. Anderson sent you a message: "Hey, can we sync on the curriculum update?"',
    actionText: null,
    time: '2d ago',
    read: true
  }
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Read'>('All');

  const filtered = mockNotifications.filter((n) => {
    if (filter === 'Unread') return !n.read;
    if (filter === 'Read') return n.read;
    return true;
  });

  return (
    <div className='max-w-[1000px] w-full pt-4 space-y-6'>
      {/* Header Container */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h2 className='text-[28px] font-bold tracking-tight text-slate-900 leading-tight'>
            Notifications
          </h2>
          <p className='text-[14px] font-medium text-slate-500 mt-0.5'>
            View and manage all your notifications.
          </p>
        </div>
        <Button
          variant='outline'
          className='bg-white border-slate-200 text-slate-700 font-bold shadow-sm h-8 px-3 rounded-lg text-[13px] hover:bg-slate-50 shrink-0 self-start md:self-auto'
        >
          Mark all as read
        </Button>
      </div>

      {/* Segmented Control Filter */}
      <div className='flex items-center'>
        <div className='flex p-1 bg-slate-50 border border-slate-200 rounded-xl max-w-fit'>
          <button
            onClick={() => setFilter('All')}
            className={`px-3 py-1 text-[13px] transition-all rounded-lg ${filter === 'All' ? 'bg-white shadow-sm border border-slate-200/60 font-bold text-slate-900' : 'font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            All (5)
          </button>
          <button
            onClick={() => setFilter('Unread')}
            className={`px-3 py-1 text-[13px] transition-all rounded-lg ${filter === 'Unread' ? 'bg-white shadow-sm border border-slate-200/60 font-bold text-slate-900' : 'font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            Unread (3)
          </button>
          <button
            onClick={() => setFilter('Read')}
            className={`px-3 py-1 text-[13px] transition-all rounded-lg ${filter === 'Read' ? 'bg-white shadow-sm border border-slate-200/60 font-bold text-slate-900' : 'font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
          >
            Read (2)
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className='space-y-3 pb-12 pt-2'>
        {filtered.map((note) => (
          <div
            key={note.id}
            className={`flex justify-between rounded-[20px] p-5 transition-all ${!note.read ? 'bg-[#f8fafc] border border-slate-100' : 'bg-transparent border border-transparent'}`}
          >
            <div className='flex flex-col items-start pr-6 flex-1'>
              <h3 className='font-bold text-[15px] text-slate-900 flex items-center leading-tight'>
                {note.title}
                {!note.read && (
                  <span className='ml-[6px] h-1.5 w-1.5 bg-[#0070f3] rounded-full shrink-0' />
                )}
              </h3>
              <p className='text-[13.5px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed'>
                {note.content}
              </p>

              {note.actionText && (
                <button className='mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/50 hover:bg-slate-200/80 text-slate-700 text-[12px] font-bold rounded-full transition-colors border border-slate-200/50'>
                  {note.actionText}
                  <ExternalLink className='h-[11px] w-[11px]' />
                </button>
              )}
            </div>

            <div className='flex flex-col justify-between items-end shrink-0 pl-4 border-l border-transparent'>
              <button className='text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md mb-8'>
                <Check className='h-[15px] w-[15px] stroke-[2.5]' />
              </button>
              <span className='text-[12px] font-bold text-slate-400 whitespace-nowrap'>
                {note.time}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className='py-20 text-center'>
            <h3 className='text-lg font-bold text-slate-900'>No notifications found</h3>
            <p className='text-sm font-medium text-slate-500'>You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
