import { ChatRoom, ChatMessage } from './chat-types';
import { apiClient } from '@/lib/api-client';

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}) {
  return apiClient<T>(endpoint, options);
}

export async function getChatRoom(courseOfferingId: string): Promise<ChatRoom> {
  return fetchWithAuth<ChatRoom>(`/chat/${courseOfferingId}`);
}

export async function sendChatMessage(
  courseOfferingId: string,
  content: string
): Promise<ChatMessage> {
  return fetchWithAuth<ChatMessage>(`/chat/${courseOfferingId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}
