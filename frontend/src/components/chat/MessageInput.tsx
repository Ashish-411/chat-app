'use client';

import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { useMessageStore, Message } from '@/store/useMessageStore';
import { useConversationStore } from '@/store/useConversationStore';

interface MessageInputProps {
  replyTo: Message | null;
  onCancelReply: () => void;
}

export default function MessageInput({ replyTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState('');
  const { sendMessage } = useMessageStore();
  const { activeConversationId } = useConversationStore();

  const handleSend = async () => {
    if (!content.trim() || !activeConversationId) return;

    await sendMessage(activeConversationId, content.trim(), replyTo?.id);
    setContent('');
    onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between mb-2 px-3 py-2 bg-gray-50 rounded-lg border-l-2 border-emerald-500">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700">
              Replying to {replyTo.sender.name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="ml-2 p-1 rounded-full hover:bg-gray-200"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="p-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}