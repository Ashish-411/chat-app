'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
} from '@/lib/pushNotifications';

export default function NotificationPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (!isPushSupported()) return;

      const permission = await getNotificationPermission();
      if (permission === 'default') {
        // Only show banner if user hasn't made a choice yet
        const dismissed = localStorage.getItem('notification_banner_dismissed');
        if (!dismissed) {
          setShowBanner(true);
        }
      }
    };

    // Small delay so it doesn't block the initial render
    const timer = setTimeout(checkPermission, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        await subscribeToPushNotifications();
        setShowBanner(false);
        localStorage.setItem('notifications_enabled', 'true');
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notification_banner_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-emerald-100">
            <Bell className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Enable Notifications
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Get notified when you receive new messages, even when the app is closed.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={isSubscribing}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSubscribing ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}