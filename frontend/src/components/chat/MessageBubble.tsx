'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, Trash2, Reply } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessageStore, Message } from '@/store/useMessageStore';
import Avatar from '@/components/Avatar';
import ReceiptTicks from './ReceiptTicks';
import { format } from 'date-fns';
import ReactionPicker from './ReactionPicker';
interface MessageBubbleProps {
  message: Message;
  onReply: (message: Message) => void;
}

export default function MessageBubble({ message, onReply }: MessageBubbleProps) {
  const { user } = useAuthStore();
  const { deleteMessage, updateMessageContent,deleteReaction } = useMessageStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const menuRef = useRef<HTMLDivElement>(null);

  const isOwnMessage = message.senderId === user?.id;

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a');
  };

  const handleDelete = () => {
    deleteMessage(message.id);
    setShowMenu(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      updateMessageContent(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div className={`flex items-end gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        {/* Avatar for other users */}
        {!isOwnMessage && (
          <Avatar name={message.sender.name} avatarUrl={message.sender.avatarUrl} size="sm" />
        )}

        <div className="relative">
          {/* Action menu button */}
          {/* Action buttons */}
          {isOwnMessage && !isEditing && (
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ReactionPicker message={message} />
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        {/* ============================================ */}
          {/* REACTION PICKER FOR RECEIVED MESSAGES (right side) */}
          {/* ============================================ */}
          {!isOwnMessage && !isEditing && (
            <div className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ReactionPicker message={message} />
            </div>
          )}



          {/* Dropdown menu */}
          {showMenu && (
            <div
              ref={menuRef}
              className="absolute -left-32 top-0 z-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-28"
            >
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => { onReply(message); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}

          {/* Reply preview */}
          {message.replyTo && (
            <div className="mb-1 px-3 py-1.5 rounded-t-lg bg-gray-100 border-l-2 border-emerald-500 text-xs text-gray-500">
              <span className="font-medium text-gray-700">
                {message.replyTo.sender.name || 'Unknown'}
              </span>
              <p className="truncate">{message.replyTo.content}</p>
            </div>
          )}

          {/* Message bubble */}
          {isEditing ? (
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="px-3 py-2 rounded-lg border border-emerald-500 focus:outline-none text-sm w-full"
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2 py-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`px-3 py-2 rounded-2xl text-sm ${
                isOwnMessage
                  ? 'bg-emerald-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
              }`}
            >
              <p className="break-words">{message.content}</p>
            </div>
          )}

          {/* Timestamp + Receipts */}
          <div className={`flex items-center gap-1 mt-0.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-400">
              {formatTime(message.createdAt)}
              {message.updatedAt !== message.createdAt && !isEditing && (
                <span className="ml-1 italic">(edited)</span>
              )}
            </span>
            {isOwnMessage && <ReceiptTicks message={message} />}
          </div>

          {/* Reactions */}
         {/* Reactions */}
            {message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {message.reactions.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (r.userId === user?.id) {
                        deleteReaction(message.id, r.emoji);
                      }
                    }}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                      r.userId === user?.id
                        ? 'bg-emerald-50 border-emerald-300 hover:bg-red-50 hover:border-red-300'
                        : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                    }`}
                    title={r.user.name || 'Unknown'}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}