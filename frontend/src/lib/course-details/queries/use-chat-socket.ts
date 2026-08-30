'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@/lib/async-query';
import {
  ChatMessage,
  ChatPresenceUser,
  ChatTypingUser,
  type ChatRoom
} from '../types';
import { useAuthStore } from '@/lib/auth-store';
import { getSocketUrl } from '@/lib/api-config';
import { chatKeys } from './chat-queries';

const SOCKET_URL = getSocketUrl();

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

function appendMessage(room: ChatRoom | undefined, message: ChatMessage): ChatRoom | undefined {
  if (!room) return room;
  if (room.messages.some((m) => m.id === message.id)) return room;
  return { ...room, messages: [...room.messages, message] };
}

function updateMessage(room: ChatRoom | undefined, message: ChatMessage): ChatRoom | undefined {
  if (!room) return room;
  return {
    ...room,
    messages: room.messages.map((m) => (m.id === message.id ? message : m))
  };
}

function removeMessage(room: ChatRoom | undefined, id: number): ChatRoom | undefined {
  if (!room) return room;
  return {
    ...room,
    messages: room.messages.filter((m) => m.id !== id)
  };
}

export function useCourseChat(courseOfferingId: string): CourseChatState {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState<ChatPresenceUser[]>([]);
  const [typing, setTyping] = useState<ChatTypingUser[]>([]);
  const [liveDeletedIds, setLiveDeletedIds] = useState<Set<number>>(new Set());
  const [liveUpdated, setLiveUpdated] = useState<Map<number, ChatMessage>>(new Map());
  const { user } = useAuthStore();
  const userId = typeof user?.id === 'number' ? user.id : Number(user?.id ?? 0) || null;

  const typingStopTimer = useRef<number | null>(null);
  const roomKey = useMemo(() => chatKeys.room(courseOfferingId), [courseOfferingId]);

  useEffect(() => {
    setMessages([]);
    setPresence([]);
    setTyping([]);
    setLiveDeletedIds(new Set());
    setLiveUpdated(new Map());

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      withCredentials: true
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_room', courseOfferingId);
    });
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_message', (message: ChatMessage) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
      queryClient.setQueryData<ChatRoom | undefined>(roomKey, (prev) =>
        appendMessage(prev, message)
      );
    });
    socket.on('message_updated', (message: ChatMessage) => {
      setLiveUpdated((prev) => {
        const next = new Map(prev);
        next.set(message.id, message);
        return next;
      });
      queryClient.setQueryData<ChatRoom | undefined>(roomKey, (prev) =>
        updateMessage(prev, message)
      );
    });
    socket.on('message_deleted', ({ id }: { id: number }) => {
      setLiveDeletedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      queryClient.setQueryData<ChatRoom | undefined>(roomKey, (prev) =>
        removeMessage(prev, id)
      );
    });

    socket.on('chat:presence', (payload: { courseOfferingId: string; users: ChatPresenceUser[] }) => {
      if (String(payload.courseOfferingId) !== String(courseOfferingId)) return;
      setPresence(payload.users.filter((u) => u.userId !== userId));
    });
    socket.on('chat:typing', (payload: { courseOfferingId: string; users: ChatTypingUser[] }) => {
      if (String(payload.courseOfferingId) !== String(courseOfferingId)) return;
      setTyping(payload.users.filter((u) => u.userId !== userId));
    });

    return () => {
      socket.emit('leave_room', courseOfferingId);
      socket.disconnect();
      if (typingStopTimer.current) window.clearTimeout(typingStopTimer.current);
    };
  }, [courseOfferingId, userId, queryClient, roomKey]);

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
