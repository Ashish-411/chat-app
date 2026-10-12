'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '@/components/sidebar/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import { useConversationStore } from '@/store/useConversationStore';

export default function ChatPage() {
  const { activeConversationId, setActiveConversation } = useConversationStore();

  // Mobile: show sidebar OR chat. Desktop: show both.
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  // ✅ FIX: When a conversation is selected, hide sidebar on mobile
  useEffect(() => {
    if (activeConversationId) {
      setShowMobileSidebar(false);
    }
  }, [activeConversationId]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          showMobileSidebar ? 'flex' : 'hidden'
        } md:flex w-full md:w-[360px] lg:w-[400px] flex-shrink-0 flex-col`}
      >
        <Sidebar />
      </div>

      {/* Chat Window */}
      <div
        className={`${
          showMobileSidebar ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col relative`}
      >
        {/* Mobile back button */}
        <button
          onClick={() => setShowMobileSidebar(true)}
          className="md:hidden absolute top-3 left-3 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        <ChatWindow />
      </div>
    </div>
  );
}