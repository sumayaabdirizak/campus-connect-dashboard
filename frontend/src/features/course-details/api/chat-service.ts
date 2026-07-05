import { ChatAttachment, ChatMessage, ChatRoom } from './chat-types';
import { apiClient } from '@/lib/api-client';
import { uploadJson } from '@/lib/upload-client';

export async function getChatRoom(
  courseOfferingId: string,
  before?: number
): Promise<ChatRoom> {
  const qs = before ? `?before=${before}` : '';
  return apiClient<ChatRoom>(`/chat/${courseOfferingId}${qs}`);
}

export async function sendChatMessage(
  courseOfferingId: string,
  content: string,
  replyToId?: number | null
): Promise<ChatMessage> {
  return apiClient<ChatMessage>(`/chat/${courseOfferingId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, replyToId: replyToId ?? null })
  });
}

export async function editChatMessage(messageId: number, content: string): Promise<ChatMessage> {
  return apiClient<ChatMessage>(`/chat/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content })
  });
}

export async function deleteChatMessage(messageId: number): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/chat/messages/${messageId}`, {
    method: 'DELETE'
  });
}

export async function uploadChatAttachments(
  messageId: number,
  files: File[]
): Promise<{ count: number; attachments: ChatAttachment[] }> {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  return uploadJson<{ count: number; attachments: ChatAttachment[] }>(
    `/chat/messages/${messageId}/attachments`,
    fd
  );
}
