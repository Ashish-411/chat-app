import { create } from 'zustand';
import api from '@/lib/api';

export interface ParticipantUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface Participant {
  id: string;
  userId: string;
  conversationId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: ParticipantUser;
}

export interface LastMessage {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  senderId: string;
  conversationId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface Conversation {
  id: string;
  type: 'DM' | 'GROUP';
  name: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  messages: LastMessage[];
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  // ✅ Global presence map: userId -> isOnline
  presenceMap: Record<string, boolean>;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  // ✅ Update last message and re-order sidebar
  updateLastMessage: (conversationId: string, message: LastMessage) => void;
  // ✅ Update a user's online/offline status
  setPresence: (userId: string, isOnline: boolean) => void;
  fetchConversations: () => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  presenceMap: {},

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),

  addConversation: (conversation) =>
    set((state) => {
      if (state.conversations.find((c) => c.id === conversation.id)) {
        return state;
      }
      return { conversations: [conversation, ...state.conversations] };
    }),

  // ✅ Update the conversation's last message and move it to the top
  updateLastMessage: (conversationId, message) =>
    set((state) => {
      const updated = state.conversations.map((conv) => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          updatedAt: message.createdAt,
          messages: [message],
        };
      });
      // Re-sort so the most recent conversation is on top
      updated.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return { conversations: updated };
    }),

  // ✅ Track online/offline status globally
  setPresence: (userId, isOnline) =>
    set((state) => ({
      presenceMap: { ...state.presenceMap, [userId]: isOnline },
    })),

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/conversations');
      set({ conversations: response.data });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      set({ isLoading: false });
    }
  },
}));