'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '@/components/sidebar/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import { useConversationStore } from '@/store/useConversationStore';

export default function ChatPage() {
  const { activeConversationId, setActiveConversation } = useConversationStore();

  // Mobile: show sidebar OR chat. Desktop: show both.
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    setShowMobileSidebar(false); // On mobile, switch to chat view
  };

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
        {activeConversationId && (
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="md:hidden absolute top-3 left-3 z-10 p-2 rounded-full bg-white shadow-md"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}
        <ChatWindow />
      </div>
    </div>
  );
}