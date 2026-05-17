'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from './chat-types';
import { useAuthStore } from '@/lib/auth-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useCourseChat(courseOfferingId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_room', courseOfferingId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit('leave_room', courseOfferingId);
      socket.disconnect();
    };
  }, [courseOfferingId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (socketRef.current?.connected && user) {
        socketRef.current.emit('send_message', {
          courseOfferingId,
          content,
          senderId: Number(user.id)
        });
      }
    },
    [courseOfferingId, user]
  );

  return { messages, setMessages, sendMessage, isConnected };
}
