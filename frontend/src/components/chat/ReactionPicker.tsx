'use client';

import { useState, useRef, useEffect } from 'react';
import { SmilePlus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessageStore, Message } from '@/store/useMessageStore';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

interface ReactionPickerProps {
  message: Message;
}

export default function ReactionPicker({ message }: ReactionPickerProps) {
  const { user } = useAuthStore();
  const { sendReaction, deleteReaction } = useMessageStore();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleEmojiClick = (emoji: string) => {
    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (r) => r.userId === user?.id && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove the reaction (toggle)
      deleteReaction(message.id, emoji);
    } else {
      // Add the reaction
      sendReaction(message.id, emoji);
    }
    setShowPicker(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        title="Add reaction"
      >
        <SmilePlus className="w-4 h-4 text-gray-400" />
      </button>

      {showPicker && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1.5 flex gap-1">
          {QUICK_EMOJIS.map((emoji) => {
            const isSelected = message.reactions.some(
              (r) => r.userId === user?.id && r.emoji === emoji
            );
            return (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className={`w-7 h-7 flex items-center justify-center rounded-full text-lg transition-colors ${
                  isSelected
                    ? 'bg-emerald-100 ring-1 ring-emerald-400'
                    : 'hover:bg-gray-100'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}