'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, User, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useChatRoom } from '../api/chat-queries';
import { useCourseChat } from '../api/use-chat-socket';

interface CourseChatProps {
  courseId: string;
  isStudent?: boolean;
}

export function CourseChat({ courseId, isStudent }: CourseChatProps) {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatRoom, isLoading } = useChatRoom(courseId);
  const { messages, sendMessage, isConnected } = useCourseChat(courseId);

  const allMessages = [...(chatRoom?.messages || []), ...messages];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    sendMessage(message);
    setMessage('');
  };

  if (isLoading && !chatRoom) {
    return (
      <div className='border rounded-lg h-[400px] flex items-center justify-center'>Loading...</div>
    );
  }

  return (
    <div className='border rounded-lg overflow-hidden'>
      <div className='p-3 border-b flex items-center justify-between'>
        <div>
          <h3 className='font-medium'>{chatRoom?.name || 'Course Chat'}</h3>
          <p className='text-xs text-muted-foreground'>{allMessages.length} messages</p>
        </div>
        <div className='flex items-center gap-1 text-xs'>
          {isConnected ? (
            <Badge className='bg-emerald-100 text-emerald-700'>
              <Wifi className='w-3 h-3 mr-1' />
              Live
            </Badge>
          ) : (
            <Badge variant='secondary'>
              <WifiOff className='w-3 h-3 mr-1' />
              Offline
            </Badge>
          )}
        </div>
      </div>

      <div className='h-[350px] overflow-y-auto p-4 space-y-3'>
        {allMessages.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground text-sm'>No messages yet</div>
        ) : (
          allMessages.map((msg) => {
            const isOwn = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <User className='w-6 h-6 text-muted-foreground' />
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  {!isOwn && <p className='text-xs font-medium mb-1'>{msg.sender.full_name}</p>}
                  <div
                    className={`inline-block p-2 rounded-lg text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  >
                    {msg.content}
                  </div>
                  <p className='text-xs text-muted-foreground mt-1'>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className='p-3 border-t flex gap-2'>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder='Type a message...'
          className='flex-1'
        />
        <Button type='submit' size='icon' disabled={!message.trim() || !isConnected}>
          <Send className='w-4 h-4' />
        </Button>
      </form>
    </div>
  );
}
