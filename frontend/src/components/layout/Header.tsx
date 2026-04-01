'use client';
import { useState, useEffect } from 'react';
import { Bell, Search } from 'lucide-react';
import Link from 'next/link';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function Header({ title }: { title?: string }) {
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    notificationsApi.unreadCount().then((r: any) => setUnread(r?.count || 0)).catch(() => {});
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title || 'SGEI'}</h1>
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
