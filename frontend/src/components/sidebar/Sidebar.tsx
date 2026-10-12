'use client';

import { useState } from 'react';
import { Search, MoreVertical, MessageSquarePlus, Users } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import Avatar from '@/components/Avatar';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-full w-full flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
          <h1 className="text-lg font-semibold text-gray-900">Chats</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="New conversation"
          >
            <MessageSquarePlus className="w-5 h-5 text-gray-600" />
          </button>
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="New group"
          >
            <Users className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-gray-100 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <MessageSquarePlus className="w-10 h-10 mb-3" />
          <p className="text-sm">No conversations yet</p>
          <p className="text-xs mt-1">Start a new chat to begin</p>
        </div>
      </div>

      {/* Footer - Logout */}
      <div className="border-t border-gray-100 px-4 py-3">
        <button
          onClick={logout}
          className="w-full rounded-lg py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}