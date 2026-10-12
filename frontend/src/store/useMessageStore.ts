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

  // Typing state: userId -> isTyping
  typingUsers: Record<string, boolean>;

  setMessages: (messages: Message[], nextCursor: string | null) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;

  setTyping: (userId: string, isTyping: boolean) => void;
  clearTyping: () => void;

  updateReceipt: (messageId: string, userId: string, status: 'SENT' | 'DELIVERED' | 'READ') => void;
  updateAllReceipts: (conversationId: string, userId: string, status: 'READ') => void;

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
  typingUsers: {},

  setMessages: (messages, nextCursor) =>
    set({ messages, nextCursor, hasMore: nextCursor !== null }),

  addMessage: (message) =>
    set((state) => {
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

  clearMessages: () => set({ messages: [], nextCursor: null, hasMore: true, typingUsers: {} }),

  setTyping: (userId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping },
    })),

  clearTyping: () => set({ typingUsers: {} }),

  updateReceipt: (messageId, userId, status) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m;
        const existingReceipt = m.receipts.find((r) => r.userId === userId);
        if (existingReceipt) {
          return {
            ...m,
            receipts: m.receipts.map((r) =>
              r.userId === userId ? { ...r, status } : r
            ),
          };
        }
        return {
          ...m,
          receipts: [...m.receipts, { userId, status, deliveredAt: null, readAt: null }],
        };
      }),
    })),

  updateAllReceipts: (conversationId, userId, status) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.conversationId !== conversationId) return m;
        if (m.senderId === userId) return m; // Don't update own messages
        const existingReceipt = m.receipts.find((r) => r.userId === userId);
        if (existingReceipt) {
          return {
            ...m,
            receipts: m.receipts.map((r) =>
              r.userId === userId ? { ...r, status } : r
            ),
          };
        }
        return m;
      }),
    })),

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
        set((state) => ({
          messages: [...data.reverse(), ...state.messages],
          nextCursor,
          hasMore: nextCursor !== null,
        }));
      } else {
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