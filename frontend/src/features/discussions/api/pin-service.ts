import { apiClient } from '@/lib/api-client';
import type { ChannelPinsResponse } from './types';

export const listChannelPins = (channelId: number) =>
  apiClient<ChannelPinsResponse>(`/discussions/channels/${channelId}/pins`);

export const pinMessage = (channelId: number, messageId: number) =>
  apiClient<{ pin: unknown }>(`/discussions/channels/${channelId}/pins`, {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  });

export const unpinMessage = (channelId: number, messageId: number) =>
  apiClient<{ ok: true }>(`/discussions/channels/${channelId}/pins/${messageId}`, {
    method: 'DELETE',
  });
