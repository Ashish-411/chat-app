'use client';

interface AvatarProps{
    name: string | null;
    avatarUrl: string | null;
    size? : 'sm' | 'md' | 'lg';
    online? : boolean;
}

const COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function Avatar({ name, avatarUrl, size = 'md', online }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  const displayName = name || 'User';
  const fullUrl = avatarUrl
    ? avatarUrl.startsWith('http')
      ? avatarUrl
      : `${process.env.NEXT_PUBLIC_API_URL}${avatarUrl}`
    : null;

  return (
    <div className="relative">
      {fullUrl ? (
        <img
          src={fullUrl}
          alt={displayName}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${getColor(displayName)} rounded-full flex items-center justify-center text-white font-semibold`}
        >
          {getInitials(displayName)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            online ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
      )}
    </div>
  );
}