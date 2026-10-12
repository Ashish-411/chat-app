'use client';

import Sidebar from '@/components/sidebar/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';

export default function ChatPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - fixed width on desktop, full on mobile */}
      <div className="w-full md:w-[360px] lg:w-[400px] flex-shrink-0">
        <Sidebar />
      </div>

      {/* Chat Window - flexible */}
      <div className="hidden md:flex flex-1">
        <ChatWindow />
      </div>
    </div>
  );
}