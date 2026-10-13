'use client';

import { useEffect, useRef } from 'react';
import { useConversationStore } from '@/store/useConversationStore';
import { useMessageStore, Message } from '@/store/useMessageStore';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';


export default function RealtimeSync() {
  const { conversations } = useConversationStore();
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  // Join every conversation room
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    conversations.forEach((conv) => {
      if (!joinedRoomsRef.current.has(conv.id)) {
        socket.emit('conversation:join', { conversationId: conv.id });
        joinedRoomsRef.current.add(conv.id);
      }
    });
  }, [conversations]);

  // Set up global socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const joinAllRooms = () => {
      const convs = useConversationStore.getState().conversations;
      convs.forEach((conv) => {
        if (!joinedRoomsRef.current.has(conv.id)) {
          socket.emit('conversation:join', { conversationId: conv.id });
          joinedRoomsRef.current.add(conv.id);
        }
      });
    };

    const handleConnect = () => {
      console.log('🔄 RealtimeSync: Socket reconnected, re-joining rooms');
      joinedRoomsRef.current.clear();
      joinAllRooms();
    };

    const handleNewMessage = (message: Message) => {
      useConversationStore
        .getState()
        .updateLastMessage(message.conversationId, message);

      const activeId = useConversationStore.getState().activeConversationId;
      if (activeId === message.conversationId) {
        useMessageStore.getState().addMessage(message);
        socket.emit('message:delivered', { messageId: message.id });
        socket.emit('conversation:read', { conversationId: message.conversationId });
      }
    };

    const handlePresence = (data: { userId: string; status: 'online' | 'offline' }) => {
      useConversationStore
        .getState()
        .setPresence(data.userId, data.status === 'online');
    };

    const handleConversationPresence = (
      data: { userId: string; isOnline: boolean }[]
    ) => {
      data.forEach((p) => {
        useConversationStore.getState().setPresence(p.userId, p.isOnline);
      });
    };

    const handleUpdatedMessage = (message: Message) => {
      useMessageStore.getState().updateMessage(message);
      useConversationStore.getState().updateLastMessage(message.conversationId, message);
    };

    const handleDeletedMessage = (data: { messageId: string; conversationId: string }) => {
      useMessageStore.getState().removeMessage(data.messageId);
    };

    const handleTypingUpdate = (data: {
      userId: string;
      conversationId: string;
      isTyping: boolean;
    }) => {
      useMessageStore.getState().setTyping(data.userId, data.isTyping);
    };

    const handleStatusUpdate = (data: {
      messageId?: string;
      conversationId: string;
      userId: string;
      status: 'DELIVERED' | 'READ';
    }) => {
      if (data.messageId) {
        useMessageStore
          .getState()
          .updateReceipt(data.messageId, data.userId, data.status);
      } else {
        useMessageStore
          .getState()
          .updateAllReceipts(data.conversationId, data.userId, 'READ');
      }
    };
    // ✅ Reaction added
    const handleReactionAdded = (data: {
      messageId: string;
      conversationId: string;
      reaction: {
        id: string;
        emoji: string;
        userId: string;
        user: { id: string; name: string | null; avatarUrl: string | null };
      };
    }) => {
      useMessageStore.getState().addReaction(data.messageId, data.reaction);
    };

    // ✅ Reaction removed
    const handleReactionRemoved = (data: {
      messageId: string;
      conversationId: string;
      userId: string;
      emoji: string;
    }) => {
      useMessageStore
        .getState()
        .removeReaction(data.messageId, data.userId, data.emoji);
    };

    // ✅ Group events
      const handleGroupUpdated = (data: { conversationId: string; name: string }) => {
        useConversationStore.getState().setConversations(
          useConversationStore.getState().conversations.map((c) =>
            c.id === data.conversationId ? { ...c, name: data.name } : c
          )
        );
      };

      const handleGroupMemberAdded = (data: {
        conversationId: string;
        addedBy: string;
        members: { id: string; name: string | null; email: string | null; avatarUrl: string | null }[];
      }) => {
        // Refetch conversation to get updated participants
        api.get(`/conversations/${data.conversationId}`).then((response) => {
          useConversationStore.getState().setConversations(
            useConversationStore.getState().conversations.map((c) =>
              c.id === data.conversationId ? response.data : c
            )
          );
        }).catch(() => {});
      };

      const handleGroupMemberRemoved = (data: {
        conversationId: string;
        removedBy: string;
        removedUserId: string;
      }) => {
        // Refetch conversation
        api.get(`/conversations/${data.conversationId}`).then((response) => {
          useConversationStore.getState().setConversations(
            useConversationStore.getState().conversations.map((c) =>
              c.id === data.conversationId ? response.data : c
            )
          );
        }).catch(() => {});
      };

      const handleGroupMemberLeft = (data: { conversationId: string; userId: string }) => {
        // Refetch conversation
        api.get(`/conversations/${data.conversationId}`).then((response) => {
          useConversationStore.getState().setConversations(
            useConversationStore.getState().conversations.map((c) =>
              c.id === data.conversationId ? response.data : c
            )
          );
        }).catch(() => {});
      };

      const handleGroupRoleChanged = (data: {
        conversationId: string;
        changedBy: string;
        targetUserId: string;
        role: string;
      }) => {
        // Refetch conversation
        api.get(`/conversations/${data.conversationId}`).then((response) => {
          useConversationStore.getState().setConversations(
            useConversationStore.getState().conversations.map((c) =>
              c.id === data.conversationId ? response.data : c
            )
          );
        }).catch(() => {});
      };

      const handleAddedToConversation = (data: { conversationId: string }) => {
        // User was added to a new conversation - refetch all
        useConversationStore.getState().fetchConversations();
      };

      const handleRemovedFromConversation = (data: { conversationId: string }) => {
        // User was removed - remove from list and clear active if it was active
        const activeId = useConversationStore.getState().activeConversationId;
        if (activeId === data.conversationId) {
          useConversationStore.getState().setActiveConversation(null);
        }
        useConversationStore.getState().fetchConversations();
      };

      
      if (socket.connected) {
        joinAllRooms();
      }
      
    socket.on('group:updated', handleGroupUpdated);
    socket.on('group:member-added', handleGroupMemberAdded);
    socket.on('group:member-removed', handleGroupMemberRemoved);
    socket.on('group:member-left', handleGroupMemberLeft);
    socket.on('group:role-changed', handleGroupRoleChanged);
    socket.on('group:added-to-conversation', handleAddedToConversation);
    socket.on('group:removed-from-conversation', handleRemovedFromConversation);
      
    socket.on('message:reaction-added', handleReactionAdded);
    socket.on('message:reaction-removed', handleReactionRemoved);
    socket.on('connect', handleConnect);
    socket.on('message:new', handleNewMessage);
    socket.on('user:presence', handlePresence);
    socket.on('conversation:presence', handleConversationPresence);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('message:status-update', handleStatusUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('message:new', handleNewMessage);
      socket.off('user:presence', handlePresence);
      socket.off('conversation:presence', handleConversationPresence);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('message:status-update', handleStatusUpdate);
      socket.off('message:reaction-added', handleReactionAdded);
      socket.off('message:reaction-removed', handleReactionRemoved); 
      socket.off('group:updated', handleGroupUpdated);
      socket.off('group:member-added', handleGroupMemberAdded);
      socket.off('group:member-removed', handleGroupMemberRemoved);
      socket.off('group:member-left', handleGroupMemberLeft);
      socket.off('group:role-changed', handleGroupRoleChanged);
      socket.off('group:added-to-conversation', handleAddedToConversation);
      socket.off('group:removed-from-conversation', handleRemovedFromConversation); 
    };
  }, []);

  return null;
}