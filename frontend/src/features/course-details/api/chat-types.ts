export interface ChatRoom {
  id: number;
  name: string;
  courseOfferingId: number | null;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  created_at: string;
  sender: {
    id: number;
    full_name: string;
  };
}
