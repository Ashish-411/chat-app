'use client';

import { useState } from 'react';
import {
  X,
  Users,
  UserPlus,
  Pencil,
  LogOut,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore, Conversation } from '@/store/useConversationStore';
import { getSocket } from '@/lib/socket';
import GroupMemberItem from './GroupMemberItem';
import Avatar from '@/components/Avatar';
import api from '@/lib/api';

interface GroupInfoPanelProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
}

export default function GroupInfoPanel({
  conversation,
  isOpen,
  onClose,
}: GroupInfoPanelProps) {
  const { user } = useAuthStore();
  const { fetchConversations, setActiveConversation } = useConversationStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(conversation.name || '');
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const myParticipant = conversation.participants.find((p) => p.userId === user?.id);
  const isAdmin = myParticipant?.role === 'ADMIN';

  if (!isOpen) return null;

  // Search users to add
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await api.get('/users/search', { params: { q: query } });
      // Filter out existing members and self
      const existingIds = new Set(conversation.participants.map((p) => p.userId));
      const results = response.data.filter(
        (u: any) => !existingIds.has(u.id) && u.id !== user?.id
      );
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddMember = async (userId: string) => {
    setIsProcessing(true);
    try {
      await api.post(`/conversations/${conversation.id}/participants`, {
        userIds: [userId],
      });
      await refreshConversation();
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRename = async () => {
    if (!groupName.trim() || groupName === conversation.name) {
      setIsEditingName(false);
      return;
    }
    setIsProcessing(true);
    try {
      await api.patch(`/conversations/${conversation.id}`, { name: groupName.trim() });
      await refreshConversation();
      setIsEditingName(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to rename group');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    setIsProcessing(true);
    try {
      await api.post(`/conversations/${conversation.id}/leave`);
      setActiveConversation(null);
      await fetchConversations();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to leave group');
    } finally {
      setIsProcessing(false);
    }
  };

  const refreshConversation = async () => {
    try {
      const response = await api.get(`/conversations/${conversation.id}`);
      // Update the conversation in the store
      useConversationStore.getState().setConversations(
        useConversationStore.getState().conversations.map((c) =>
          c.id === conversation.id ? response.data : c
        )
      );
    } catch {
      // Fallback: refetch all
      await fetchConversations();
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-black/20">
      <div className="w-full max-w-sm h-full bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Group Info</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Group name + avatar */}
          <div className="px-4 py-6 text-center border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
            {isEditingName ? (
              <div className="flex items-center gap-2 justify-center">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  autoFocus
                />
                <button
                  onClick={handleRename}
                  className="p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {conversation.name || 'Group Chat'}
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {conversation.participants.length} members
            </p>
          </div>

          {/* Add members (admin only) */}
          {isAdmin && (
            <div className="px-4 py-3 border-b border-gray-100">
              {isAddingMembers ? (
                <div>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search users to add..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      autoFocus
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleAddMember(result.id)}
                          disabled={isProcessing}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <Avatar name={result.name} avatarUrl={result.avatarUrl} size="sm" />
                          <span className="text-sm text-gray-900">{result.name || result.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { setIsAddingMembers(false); setSearchQuery(''); setSearchResults([]); }}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingMembers(true)}
                  className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Members
                </button>
              )}
            </div>
          )}

          {/* Members list */}
          <div className="py-2">
            <p className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Members
            </p>
            {conversation.participants.map((participant) => (
              <GroupMemberItem
                key={participant.id}
                participant={participant}
                conversationId={conversation.id}
                isAdminViewer={isAdmin}
                onUpdate={refreshConversation}
              />
            ))}
          </div>
        </div>

        {/* Footer - Leave group */}
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={handleLeaveGroup}
            disabled={isProcessing}
            className="flex items-center gap-2 w-full justify-center rounded-lg py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            Leave Group
          </button>
        </div>
      </div>
    </div>
  );
}