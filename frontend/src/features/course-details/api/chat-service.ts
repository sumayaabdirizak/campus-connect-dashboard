import { ChatAttachment, ChatMessage, ChatRoom } from './chat-types';
import { apiClient, ensureCsrfToken } from '@/lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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
  const csrfToken = await ensureCsrfToken();
  const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}/attachments`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    body: fd
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Upload failed: ${res.status}`);
  }
  return res.json();
}
