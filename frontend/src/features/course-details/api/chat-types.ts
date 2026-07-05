export interface ChatMessageSender {
  id: number;
  full_name: string;
}

export interface ChatReplyTo {
  id: number;
  content: string;
  senderId: number;
  sender: ChatMessageSender;
}

export interface ChatAttachment {
  id: number;
  messageId: number;
  name: string;
  url: string;
  size: number | null;
  mimeType: string | null;
  created_at: string;
}

export interface ChatMention {
  userId: number;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  replyToId: number | null;
  editedAt: string | null;
  created_at: string;
  sender: ChatMessageSender;
  replyTo?: ChatReplyTo | null;
  attachments: ChatAttachment[];
  mentions: ChatMention[];
}

export interface ChatRoom {
  id: number;
  name: string;
  courseOfferingId: string | null;
  messages: ChatMessage[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface ChatPresenceUser {
  userId: number;
  full_name: string;
}

export interface ChatTypingUser {
  userId: number;
  full_name: string;
}
