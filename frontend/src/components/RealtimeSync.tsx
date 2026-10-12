'use client';

import { useEffect, useRef } from 'react';
import { useConversationStore } from '@/store/useConversationStore';
import { useMessageStore, Message } from '@/store/useMessageStore';
import { getSocket } from '@/lib/socket';

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

    if (socket.connected) {
      joinAllRooms();
    }

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
    };
  }, []);

  return null;
}