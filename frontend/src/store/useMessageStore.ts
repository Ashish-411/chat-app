import { create } from 'zustand';
import api from '@/lib/api';

export interface MessageSender {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  user: MessageSender;
}

export interface MessageReceipt {
  userId: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  deliveredAt: string | null;
  readAt: string | null;
}

export interface ReplyTo {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  sender: MessageSender;
}

export interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  senderId: string;
  conversationId: string;
  replyToId: string | null;
  createdAt: string;
  updatedAt: string;
  sender: MessageSender;
  reactions: MessageReaction[];
  replyTo: ReplyTo | null;
  receipts: MessageReceipt[];
}

interface MessageState {
  messages: Message[];
  nextCursor: string | null;
  isLoading: boolean;
  hasMore: boolean;
  setMessages: (messages: Message[], nextCursor: string | null) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
  fetchMessages: (conversationId: string, cursor?: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, replyToId?: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  updateMessageContent: (messageId: string, content: string) => Promise<void>;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  nextCursor: null,
  isLoading: false,
  hasMore: true,

  setMessages: (messages, nextCursor) =>
    set({ messages, nextCursor, hasMore: nextCursor !== null }),

  addMessage: (message) =>
    set((state) => {
      // Avoid duplicates
      if (state.messages.find((m) => m.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    }),

  updateMessage: (message) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === message.id ? message : m
      ),
    })),

  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  clearMessages: () => set({ messages: [], nextCursor: null, hasMore: true }),

  fetchMessages: async (conversationId, cursor) => {
    set({ isLoading: true });
    try {
      const params: any = { limit: 50 };
      if (cursor) params.cursor = cursor;

      const response = await api.get(
        `/conversations/${conversationId}/messages`,
        { params }
      );

      const { data, nextCursor } = response.data;

      if (cursor) {
        // Append older messages at the top
        set((state) => ({
          messages: [...data.reverse(), ...state.messages],
          nextCursor,
          hasMore: nextCursor !== null,
        }));
      } else {
        // Initial load: reverse to show oldest first
        set({
          messages: data.reverse(),
          nextCursor,
          hasMore: nextCursor !== null,
        });
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationId, content, replyToId) => {
    try {
      const body: any = { content };
      if (replyToId) body.replyToId = replyToId;

      const response = await api.post(
        `/conversations/${conversationId}/messages`,
        body
      );

      get().addMessage(response.data);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      get().removeMessage(messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  },

  updateMessageContent: async (messageId, content) => {
    try {
      const response = await api.patch(`/messages/${messageId}`, { content });
      get().updateMessage(response.data);
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  },
}));