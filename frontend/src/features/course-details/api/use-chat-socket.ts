'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ChatMessage,
  ChatPresenceUser,
  ChatTypingUser
} from './chat-types';
import { useAuthStore } from '@/lib/auth-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CourseChatState {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sendMessage: (content: string, replyToId?: number | null) => void;
  isConnected: boolean;
  presence: ChatPresenceUser[];
  typing: ChatTypingUser[];
  emitTyping: (state: 'start' | 'stop') => void;
  liveDeletedIds: Set<number>;
  liveUpdated: Map<number, ChatMessage>;
}

export function useCourseChat(courseOfferingId: string): CourseChatState {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState<ChatPresenceUser[]>([]);
  const [typing, setTyping] = useState<ChatTypingUser[]>([]);
  const [liveDeletedIds, setLiveDeletedIds] = useState<Set<number>>(new Set());
  const [liveUpdated, setLiveUpdated] = useState<Map<number, ChatMessage>>(new Map());
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0) || null;

  // Debounce typing-stop on inactivity so the indicator clears even if the user
  // never explicitly stops (e.g. closes the tab).
  const typingStopTimer = useRef<number | null>(null);

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
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });
    socket.on('message_updated', (message: ChatMessage) => {
      setLiveUpdated((prev) => {
        const next = new Map(prev);
        next.set(message.id, message);
        return next;
      });
    });
    socket.on('message_deleted', ({ id }: { id: number }) => {
      setLiveDeletedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    });

    socket.on('chat:presence', (payload: { courseOfferingId: number; users: ChatPresenceUser[] }) => {
      if (String(payload.courseOfferingId) !== String(courseOfferingId)) return;
      // Exclude self from the displayed presence list — it's about who *else*
      // is here. The empty-state copy depends on this.
      setPresence(payload.users.filter((u) => u.userId !== userId));
    });
    socket.on('chat:typing', (payload: { courseOfferingId: number; users: ChatTypingUser[] }) => {
      if (String(payload.courseOfferingId) !== String(courseOfferingId)) return;
      setTyping(payload.users.filter((u) => u.userId !== userId));
    });

    return () => {
      socket.emit('leave_room', courseOfferingId);
      socket.disconnect();
      if (typingStopTimer.current) window.clearTimeout(typingStopTimer.current);
    };
  }, [courseOfferingId, userId]);

  const sendMessage = useCallback(
    (content: string, replyToId?: number | null) => {
      if (socketRef.current?.connected && user) {
        socketRef.current.emit('send_message', {
          courseOfferingId,
          content,
          senderId: Number(user.id),
          replyToId: replyToId ?? null
        });
      }
    },
    [courseOfferingId, user]
  );

  const emitTyping = useCallback(
    (state: 'start' | 'stop') => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      socket.emit('chat:typing', { courseOfferingId, state });
      if (typingStopTimer.current) window.clearTimeout(typingStopTimer.current);
      if (state === 'start') {
        // Auto-fire stop 3s after last keystroke; server also expires at 4s.
        typingStopTimer.current = window.setTimeout(() => {
          socket.emit('chat:typing', { courseOfferingId, state: 'stop' });
        }, 3000);
      }
    },
    [courseOfferingId]
  );

  return {
    messages,
    setMessages,
    sendMessage,
    isConnected,
    presence,
    typing,
    emitTyping,
    liveDeletedIds,
    liveUpdated
  };
}
