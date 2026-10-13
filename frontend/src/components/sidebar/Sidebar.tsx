'use client';

import { useState, useEffect } from 'react';
import { MessageSquarePlus, Users, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore } from '@/store/useConversationStore';
import { disconnectSocket } from '@/lib/socket';
import Avatar from '@/components/Avatar';
import ConversationItem from './ConversationItem';
import NewConversationModal from './NewConversationModel';
import api from '@/lib/api';
import ProfileModal from '../profile/ProfileModal';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { conversations, isLoading, fetchConversations } = useConversationStore();

  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors
    }
    disconnectSocket();
    logout();
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const otherParticipant = conv.participants.find((p) => p.userId !== user?.id);
    const name =
      conv.type === 'GROUP'
        ? conv.name || ''
        : otherParticipant?.user?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-full w-full flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 rounded-lg px-2 py-1 -mx-2 hover:bg-gray-50 transition-colors"
          title="View profile"
        >
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
          <div className="text-left">
            <p className="font-medium text-gray-900 text-sm">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewDM(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="New conversation"
          >
            <MessageSquarePlus className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setShowNewGroup(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="New group"
          >
            <Users className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg bg-gray-100 py-2 px-3 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquarePlus className="w-10 h-10 mb-3" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))
        )}
      </div>

      {/* Footer - Logout */}
      <div className="border-t border-gray-100 px-4 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Modals */}
      <NewConversationModal
        isOpen={showNewDM}
        onClose={() => setShowNewDM(false)}
        mode="dm"
      />
      <NewConversationModal
        isOpen={showNewGroup}
        onClose={() => setShowNewGroup(false)}
        mode="group"
      />
      {/* Profile Modal */}
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}