'use client';

import { MessageSquare } from 'lucide-react';

export default function ChatWindow() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome to Chat</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Select a conversation from the sidebar to start messaging
        </p>
      </div>
    </div>
  );
}