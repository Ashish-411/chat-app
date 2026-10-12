'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { useConversationStore } from '@/store/useConversationStore';
import { useMessageStore, Message } from '@/store/useMessageStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getSocket } from '@/lib/socket';
import Avatar from '@/components/Avatar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import SearchMessagesModal from './SearchMessagesModal';

export default function ChatWindow() {
  const { activeConversationId, conversations, setActiveConversation } = useConversationStore();
  const { messages, isLoading, fetchMessages, clearMessages, addMessage, updateMessage, removeMessage } = useMessageStore();
  const { user } = useAuthStore();

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      clearMessages();
      fetchMessages(activeConversationId);

      // Join socket room
      const socket = getSocket();
      if (socket) {
        socket.emit('conversation:join', { conversationId: activeConversationId });
      }
    }

    return () => {
      if (activeConversationId) {
        const socket = getSocket();
        if (socket) {
          socket.emit('conversation:leave', { conversationId: activeConversationId });
        }
      }
    };
  }, [activeConversationId, clearMessages, fetchMessages]);

  // Listen for real-time messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      if (message.conversationId === activeConversationId) {
        addMessage(message);
      }
    };

    const handleUpdatedMessage = (message: Message) => {
      if (message.conversationId === activeConversationId) {
        updateMessage(message);
      }
    };

    const handleDeletedMessage = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === activeConversationId) {
        removeMessage(data.messageId);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:deleted', handleDeletedMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('message:deleted', handleDeletedMessage);
    };
  }, [activeConversationId, addMessage, updateMessage, removeMessage]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get display name
  const getDisplayName = () => {
    if (!activeConversation) return '';
    if (activeConversation.type === 'GROUP') {
      return activeConversation.name || 'Group Chat';
    }
    const otherParticipant = activeConversation.participants.find(
      (p) => p.userId !== user?.id
    );
    return otherParticipant?.user?.name || 'Unknown User';
  };

  const getDisplayAvatar = () => {
    if (!activeConversation || activeConversation.type === 'GROUP') return null;
    const otherParticipant = activeConversation.participants.find(
      (p) => p.userId !== user?.id
    );
    return otherParticipant?.user?.avatarUrl || null;
  };

  // Empty state
  if (!activeConversationId || !activeConversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome to Chat</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Select a conversation from the sidebar to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          <button
            onClick={() => setActiveConversation(null)}
            className="md:hidden p-1 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <Avatar name={getDisplayName()} avatarUrl={getDisplayAvatar()} size="sm" />
          <div>
            <h2 className="font-medium text-gray-900 text-sm">{getDisplayName()}</h2>
            <p className="text-xs text-gray-500">
              {activeConversation.type === 'GROUP'
                ? `${activeConversation.participants.length} members`
                : 'Direct message'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Search className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onReply={setReplyTo}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />

      {/* Search Modal */}
      <SearchMessagesModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}