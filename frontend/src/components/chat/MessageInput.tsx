'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { useMessageStore, Message } from '@/store/useMessageStore';
import { useConversationStore } from '@/store/useConversationStore';
import { getSocket } from '@/lib/socket';

interface MessageInputProps {
  replyTo: Message | null;
  onCancelReply: () => void;
}

export default function MessageInput({ replyTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState('');
  const { sendMessage } = useMessageStore();
  const { activeConversationId } = useConversationStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const emitTypingStart = useCallback(() => {
    const socket = getSocket();
    if (socket && activeConversationId && !isTypingRef.current) {
      socket.emit('typing:start', { conversationId: activeConversationId });
      isTypingRef.current = true;
    }
  }, [activeConversationId]);

  const emitTypingStop = useCallback(() => {
    const socket = getSocket();
    if (socket && activeConversationId && isTypingRef.current) {
      socket.emit('typing:stop', { conversationId: activeConversationId });
      isTypingRef.current = false;
    }
  }, [activeConversationId]);

  const handleTyping = (value: string) => {
    setContent(value);

    if (value.trim()) {
      emitTypingStart();

      // Reset the typing stop timer
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStop();
      }, 2000); // Stop typing indicator after 2 seconds of no typing
    } else {
      emitTypingStop();
    }
  };

  const handleSend = async () => {
    if (!content.trim() || !activeConversationId) return;

    emitTypingStop();
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

  // Cleanup typing state on unmount
  useEffect(() => {
    return () => {
      emitTypingStop();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [emitTypingStop]);

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
          onChange={(e) => handleTyping(e.target.value)}
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