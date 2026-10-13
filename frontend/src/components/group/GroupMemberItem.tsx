'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2, Shield, ShieldOff } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore, Participant } from '@/store/useConversationStore';
import Avatar from '@/components/Avatar';
import api from '@/lib/api';

interface GroupMemberItemProps {
  participant: Participant;
  conversationId: string;
  isAdminViewer: boolean;
  onUpdate: () => void;
}

export default function GroupMemberItem({
  participant,
  conversationId,
  isAdminViewer,
  onUpdate,
}: GroupMemberItemProps) {
  const { user } = useAuthStore();
  const { presenceMap } = useConversationStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSelf = participant.userId === user?.id;
  const isOnline = presenceMap[participant.userId] ?? false;

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleRemove = async () => {
    setIsProcessing(true);
    try {
      await api.delete(`/conversations/${conversationId}/participants/${participant.userId}`);
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsProcessing(false);
      setShowMenu(false);
    }
  };

  const handleToggleRole = async () => {
    setIsProcessing(true);
    const newRole = participant.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    try {
      await api.patch(
        `/conversations/${conversationId}/participants/${participant.userId}/role`,
        { role: newRole }
      );
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update role');
    } finally {
      setIsProcessing(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
      <Avatar
        name={participant.user.name}
        avatarUrl={participant.user.avatarUrl}
        size="sm"
        online={isOnline}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {participant.user.name || participant.user.email || 'Unknown'}
          {isSelf && <span className="text-gray-400 ml-1">(You)</span>}
        </p>
        <p className="text-xs text-gray-500 truncate">{participant.user.email}</p>
      </div>

      {/* Role badge */}
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          participant.role === 'ADMIN'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-gray-100 text-gray-500'
        }`}
      >
        {participant.role === 'ADMIN' ? 'Admin' : 'Member'}
      </span>

      {/* Admin menu */}
      {isAdminViewer && !isSelf && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-full hover:bg-gray-200"
            disabled={isProcessing}
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <button
                onClick={handleToggleRole}
                disabled={isProcessing}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {participant.role === 'ADMIN' ? (
                  <>
                    <ShieldOff className="w-4 h-4" />
                    Demote to Member
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Make Admin
                  </>
                )}
              </button>
              <button
                onClick={handleRemove}
                disabled={isProcessing}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}