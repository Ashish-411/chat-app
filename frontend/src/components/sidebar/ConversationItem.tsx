'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore, Conversation } from '@/store/useConversationStore';
import Avatar from '@/components/Avatar';
import { formatDistanceToNow } from 'date-fns';

interface ConversationItemProps {
  conversation: Conversation;
}

export default function ConversationItem({ conversation }: ConversationItemProps) {
  const { user } = useAuthStore();
  const { activeConversationId, setActiveConversation } = useConversationStore();

  const isActive = activeConversationId === conversation.id;

  // For DM: show the OTHER user's name/avatar
  // For GROUP: show the group name
  const otherParticipant = conversation.participants.find(
    (p) => p.userId !== user?.id
  );

  const displayName =
    conversation.type === 'GROUP'
      ? conversation.name || 'Group Chat'
      : otherParticipant?.user?.name || 'Unknown User';

  const displayAvatar =
    conversation.type === 'GROUP'
      ? null
      : otherParticipant?.user?.avatarUrl || null;

  const lastMessage = conversation.messages[0];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDistanceToNow(date, { addSuffix: false });
  };

  return (
    <button
      onClick={() => setActiveConversation(conversation.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive
          ? 'bg-emerald-50 border-r-2 border-emerald-500'
          : 'hover:bg-gray-50'
      }`}
    >
      <Avatar
        name={displayName}
        avatarUrl={displayAvatar}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 text-sm truncate">
            {displayName}
          </span>
          {lastMessage && (
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {lastMessage
            ? lastMessage.type === 'IMAGE'
              ? '📷 Photo'
              : lastMessage.type === 'FILE'
              ? '📎 File'
              : lastMessage.content
            : 'No messages yet'}
        </p>
      </div>
    </button>
  );
}