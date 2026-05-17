import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { getChatRoom, sendChatMessage } from './chat-service';

export const chatKeys = {
  room: (courseOfferingId: string) => ['chat', courseOfferingId] as const
};

export function useChatRoom(courseOfferingId: string) {
  return useQuery({
    queryKey: chatKeys.room(courseOfferingId),
    queryFn: () => getChatRoom(courseOfferingId),
    refetchInterval: 30000
  });
}

export function useSendChatMessage(courseOfferingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content }: { content: string }) => sendChatMessage(courseOfferingId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.room(courseOfferingId) });
    }
  });
}
