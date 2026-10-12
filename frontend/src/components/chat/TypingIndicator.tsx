'use client';

import { useMessageStore } from '@/store/useMessageStore';
import { useConversationStore } from '@/store/useConversationStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function TypingIndicator() {
  const { typingUsers } = useMessageStore();
  const { conversations, activeConversationId } = useConversationStore();
  const { user } = useAuthStore();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  if (!activeConversation) return null;

  // Get typing users (exclude self)
  const typingUserIds = Object.entries(typingUsers)
    .filter(([userId, isTyping]) => isTyping && userId !== user?.id)
    .map(([userId]) => userId);

  if (typingUserIds.length === 0) return null;

  // Get names of typing users
  const typingNames = typingUserIds.map((userId) => {
    const participant = activeConversation.participants.find((p) => p.userId === userId);
    return participant?.user?.name || 'Someone';
  });

  const text = typingNames.length === 1
    ? `${typingNames[0]} is typing`
    : typingNames.length === 2
    ? `${typingNames[0]} and ${typingNames[1]} are typing`
    : 'Several people are typing';

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span>{text}...</span>
    </div>
  );
}