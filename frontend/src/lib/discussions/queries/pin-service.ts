import { apiClient } from '@/lib/api-client';
import type { ChannelPinsResponse } from '@/lib/discussions/queries/types';

export const listChannelPins = (channelId: string) =>
  apiClient<ChannelPinsResponse>(`/discussions/channels/${channelId}/pins`);

export const pinMessage = (channelId: string, messageId: string) =>
  apiClient<{ pin: unknown }>(`/discussions/channels/${channelId}/pins`, {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  });

export const unpinMessage = (channelId: string, messageId: string) =>
  apiClient<{ ok: true }>(`/discussions/channels/${channelId}/pins/${messageId}`, {
    method: 'DELETE',
  });
