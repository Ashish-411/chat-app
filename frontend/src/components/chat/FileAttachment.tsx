'use client';

import { FileText, Download } from 'lucide-react';

interface FileAttachmentProps {
  content: string;
  isOwnMessage: boolean;
}

export default function FileAttachment({ content, isOwnMessage }: FileAttachmentProps) {
  let fileName = 'File';
  let fileUrl = '';

  try {
    const parsed = JSON.parse(content);
    fileName = parsed.name || 'File';
    fileUrl = parsed.url || '';
  } catch {
    // If content is not JSON, treat it as a URL
    fileUrl = content;
    fileName = content.split('/').pop() || 'File';
  }

  const fullUrl = fileUrl.startsWith('http')
    ? fileUrl
    : `${process.env.NEXT_PUBLIC_API_URL}${fileUrl}`;

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
        isOwnMessage
          ? 'bg-emerald-700/50 hover:bg-emerald-700'
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className={`p-2 rounded-lg ${isOwnMessage ? 'bg-emerald-500' : 'bg-emerald-100'}`}>
        <FileText className={`w-5 h-5 ${isOwnMessage ? 'text-white' : 'text-emerald-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
          {fileName}
        </p>
        <p className={`text-xs ${isOwnMessage ? 'text-emerald-200' : 'text-gray-500'}`}>
          Tap to download
        </p>
      </div>
      <Download className={`w-4 h-4 ${isOwnMessage ? 'text-emerald-200' : 'text-gray-400'}`} />
    </a>
  );
}