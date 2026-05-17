'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Phone, Video, MoreVertical, Send as SendIcon } from 'lucide-react';

interface CourseRoomsProps {
  courseId: string;
}

const messages = [
  {
    id: '1',
    sender: 'Dr. John Smith',
    content: 'Has everyone reviewed the latest lecture notes on SQL joins?',
    timestamp: new Date(Date.now() - 3600000),
    isOwn: false
  },
  {
    id: '2',
    sender: 'You',
    content: 'Yes, but I have a question about Cross Joins vs Inner Joins.',
    timestamp: new Date(Date.now() - 1800000),
    isOwn: true
  },
  {
    id: '3',
    sender: 'Sarah Connor',
    content: 'I found a great visualization for that, I will post the link soon!',
    timestamp: new Date(Date.now() - 600000),
    isOwn: false
  },
  {
    id: '4',
    sender: 'John Doe',
    content: 'Thanks! Looking forward to it.',
    timestamp: new Date(Date.now() - 300000),
    isOwn: false
  }
];

const participants = ['Dr. John Smith', 'Sarah Connor', 'John Doe', 'Ali Khan', 'Fatima'];

export function CourseRooms({ courseId }: CourseRoomsProps) {
  const [message, setMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessage('');
  };

  return (
    <div className='grid grid-cols-1 lg:grid-cols-4 gap-4'>
      <div className='border rounded-lg p-4 hidden lg:block'>
        <h3 className='font-medium mb-4'>Participants ({participants.length})</h3>
        <div className='space-y-2'>
          {participants.map((p, i) => (
            <div key={i} className='flex items-center gap-2 text-sm'>
              <Avatar className='h-6 w-6'>
                <AvatarFallback className='text-xs'>{p[0]}</AvatarFallback>
              </Avatar>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>

      <div className='lg:col-span-3 border rounded-lg flex flex-col'>
        <div className='p-3 border-b flex items-center justify-between'>
          <div>
            <h3 className='font-medium'>Batch A-26</h3>
            <p className='text-xs text-muted-foreground'>24 students online</p>
          </div>
          <div className='flex gap-1'>
            <Button variant='ghost' size='icon' className='h-8 w-8'>
              <Phone className='w-4 h-4' />
            </Button>
            <Button variant='ghost' size='icon' className='h-8 w-8'>
              <Video className='w-4 h-4' />
            </Button>
            <Button variant='ghost' size='icon' className='h-8 w-8'>
              <MoreVertical className='w-4 h-4' />
            </Button>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto p-4 space-y-4'>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
              <Avatar className='h-8 w-8'>
                <AvatarFallback className='text-xs'>{msg.sender[0]}</AvatarFallback>
              </Avatar>
              <div className={`max-w-[70%] ${msg.isOwn ? 'text-right' : ''}`}>
                <p className='text-xs font-medium mb-1'>{msg.sender}</p>
                <div
                  className={`inline-block p-2 rounded-lg text-sm ${msg.isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  {msg.content}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className='p-3 border-t flex gap-2'>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Type a message...'
            className='flex-1'
          />
          <Button type='submit' size='icon'>
            <SendIcon className='w-4 h-4' />
          </Button>
        </form>
      </div>
    </div>
  );
}
