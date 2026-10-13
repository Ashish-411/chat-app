'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, X, Image, Paperclip, Loader2 } from 'lucide-react';
import { useMessageStore, Message } from '@/store/useMessageStore';
import { useConversationStore } from '@/store/useConversationStore';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';

interface MessageInputProps {
  replyTo: Message | null;
  onCancelReply: () => void;
}

export default function MessageInput({ replyTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const {sendMessage} = useMessageStore();
  const { activeConversationId } = useConversationStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStop();
      }, 2000);
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

  // ✅ Upload and send image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Send as IMAGE message with the URL as content
      await sendMessage(activeConversationId, response.data.url, replyTo?.id, 'IMAGE');
      onCancelReply();
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // ✅ Upload and send file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Send as FILE message with JSON content containing url and name
      const fileContent = JSON.stringify({
        url: response.data.url,
        name: response.data.originalName,
      });
      await sendMessage(activeConversationId, fileContent, replyTo?.id, 'FILE');
      onCancelReply();
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Image upload button */}
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isUploading}
          className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition-colors disabled:opacity-50"
          title="Send image"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Image className="w-5 h-5" />
          )}
        </button>

        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition-colors disabled:opacity-50"
          title="Send file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text input */}
        <input
          type="text"
          value={content}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || isUploading}
          className="p-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}