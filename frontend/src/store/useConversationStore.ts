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
  sender: ParticipantUser;
}

export interface Conversation {
  id: string;
  type: 'DM' | 'GROUP';
  name: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  messages: LastMessage[]; // last 1 message
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  fetchConversations: () => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),

  addConversation: (conversation) =>
    set((state) => {
      // Avoid duplicates
      if (state.conversations.find((c) => c.id === conversation.id)) {
        return state;
      }
      return { conversations: [conversation, ...state.conversations] };
    }),

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