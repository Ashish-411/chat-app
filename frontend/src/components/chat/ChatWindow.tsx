// frontend/src/components/chat/ChatWindow.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Info } from 'lucide-react';
import { useConversationStore } from '@/store/useConversationStore';
import { useMessageStore, Message } from '@/store/useMessageStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getSocket } from '@/lib/socket';
import Avatar from '@/components/Avatar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import SearchMessagesModal from './SearchMessagesModal';
import TypingIndicator from './TypingIndicator';
import GroupInfoPanel from '../group/GroupInfoPanel';


export default function ChatWindow() {
  const { activeConversationId, conversations, presenceMap } =
    useConversationStore();
  const { messages, isLoading, fetchMessages, clearMessages } = useMessageStore();
  const { user } = useAuthStore();

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    if (activeConversationId) {
      clearMessages();
      fetchMessages(activeConversationId);

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('conversation:read', { conversationId: activeConversationId });
      }
    }
  }, [activeConversationId, clearMessages, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const isOtherUserOnline = () => {
    if (!activeConversation || activeConversation.type === 'GROUP') return undefined;
    const otherParticipant = activeConversation.participants.find(
      (p) => p.userId !== user?.id
    );
    if (!otherParticipant) return undefined;
    return presenceMap[otherParticipant.userId] ?? false;
  };

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
      {/* Header — NO back button here, ChatPage handles it */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* ✅ Add left padding on mobile so the ChatPage back button doesn't overlap */}
          <div className="md:hidden w-8" />
          <Avatar
            name={getDisplayName()}
            avatarUrl={getDisplayAvatar()}
            size="sm"
            online={isOtherUserOnline()}
          />
          <div>
            <h2 className="font-medium text-gray-900 text-sm">{getDisplayName()}</h2>
            <p className="text-xs text-gray-500">
              {activeConversation.type === 'GROUP'
                ? `${activeConversation.participants.length} members`
                : isOtherUserOnline() === true
                ? 'Online'
                : isOtherUserOnline() === false
                ? 'Offline'
                : 'Direct message'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeConversation.type === 'GROUP' && (
            <button
              onClick={() => setShowGroupInfo(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Group info"
            >
              <Info className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
        </div>
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
            <MessageBubble key={message.id} message={message} onReply={setReplyTo} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <TypingIndicator />
      <MessageInput replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      <SearchMessagesModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
      {/* Group Info Panel */}
      {activeConversation.type === 'GROUP' && (
        <GroupInfoPanel
          conversation={activeConversation}
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </div>
  );
}