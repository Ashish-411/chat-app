'use client';

import { useState, useEffect } from 'react';
import { X, Search, Users, User } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore } from '@/store/useConversationStore';
import Avatar from '@/components/Avatar';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'dm' | 'group';
}

interface SearchResult {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export default function NewConversationModal({
  isOpen,
  onClose,
  mode,
}: NewConversationModalProps) {
  const { user } = useAuthStore();
  const { addConversation, setActiveConversation } = useConversationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchResult[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Search users
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/users/search', {
          params: { q: searchQuery },
        });
        // Filter out self
        const results = response.data.filter(
          (u: SearchResult) => u.id !== user?.id
        );
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  const toggleUser = (selectedUser: SearchResult) => {
    setSelectedUsers((prev) => {
      if (mode === 'dm') {
        return [selectedUser]; // DM: only one user
      }
      const exists = prev.find((u) => u.id === selectedUser.id);
      if (exists) {
        return prev.filter((u) => u.id !== selectedUser.id);
      }
      return [...prev, selectedUser];
    });
  };

  const handleCreate = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'dm') {
        const targetUser = selectedUsers[0];
        if (!targetUser) return;

        const response = await api.post('/conversations/dm', {
          userId: targetUser.id,
        });
        addConversation(response.data);
        setActiveConversation(response.data.id);
      } else {
        if (!groupName.trim()) {
          setError('Please enter a group name');
          return;
        }
        if (selectedUsers.length === 0) {
          setError('Please select at least one member');
          return;
        }

        const response = await api.post('/conversations/group', {
          name: groupName.trim(),
          memberIds: selectedUsers.map((u) => u.id),
        });
        addConversation(response.data);
        setActiveConversation(response.data.id);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create conversation');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'dm' ? 'New Conversation' : 'New Group'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Group name input (only for group mode) */}
        {mode === 'group' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Selected users chips */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"
              >
                {u.name || u.email}
                <button
                  onClick={() => toggleUser(u)}
                  className="ml-0.5 hover:text-emerald-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search results */}
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
          {searchResults.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {searchQuery ? 'No users found' : 'Type to search'}
            </p>
          ) : (
            searchResults.map((result) => {
              const isSelected = selectedUsers.some((u) => u.id === result.id);
              return (
                <button
                  key={result.id}
                  onClick={() => toggleUser(result)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <Avatar name={result.name} avatarUrl={result.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{result.email}</p>
                  </div>
                  {mode === 'group' && (
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded-md">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || (mode === 'dm' && selectedUsers.length === 0) || (mode === 'group' && (!groupName.trim() || selectedUsers.length === 0))}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : mode === 'dm' ? 'Start Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}