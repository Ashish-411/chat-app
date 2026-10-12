'use client';

import { Check, CheckCheck } from 'lucide-react';
import { Message } from '@/store/useMessageStore';
import { useConversationStore } from '@/store/useConversationStore';

interface ReceiptTicksProps {
  message: Message;
}

export default function ReceiptTicks({ message }: ReceiptTicksProps) {
  const { conversations } = useConversationStore();
  const conversation = conversations.find((c) => c.id === message.conversationId);

  if (!conversation || message.receipts.length === 0) {
    return <Check className="w-3.5 h-3.5 text-gray-400" />;
  }

  // Get the "best" status across all receipts
  const statuses = message.receipts.map((r) => r.status);

  const hasRead = statuses.includes('READ');
  const hasDelivered = statuses.includes('DELIVERED');

  if (hasRead) {
    return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
  }
  if (hasDelivered) {
    return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
  }
  return <Check className="w-3.5 h-3.5 text-gray-400" />;
}