'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import api from '@/lib/api';
import { useConversationStore } from '@/store/useConversationStore';
import { Message } from '@/store/useMessageStore';
import { format } from 'date-fns';

interface SearchMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchMessagesModal({ isOpen, onClose }: SearchMessagesModalProps) {
  const { activeConversationId } = useConversationStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || !activeConversationId) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await api.get(
          `/conversations/${activeConversationId}/messages/search`,
          { params: { q: query } }
        );
        setResults(response.data.data || []);
      } catch (err) {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeConversationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-20">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Search Messages</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {query ? 'No messages found' : 'Type to search'}
            </p>
          ) : (
            results.map((msg) => (
              <div
                key={msg.id}
                className="px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">
                    {msg.sender.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}