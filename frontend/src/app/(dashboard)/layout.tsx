'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/layout/Sidebar';
import ChatWidget from '@/components/chat/ChatWidget';
import { ChatProvider } from '@/contexts/ChatContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    // Redirect unconfirmed TEACHER/STAFF users to role selection
    if (
      user &&
      (user.role === 'TEACHER' || user.role === 'STAFF') &&
      !user.roleConfirmed
    ) {
      router.replace('/onboarding/role');
      return;
    }
  }, [isAuthenticated, isHydrated, router, user]);

  if (!isHydrated) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return null;
  // Client-side redirect for unconfirmed users — render nothing briefly
  if (
    user &&
    (user.role === 'TEACHER' || user.role === 'STAFF') &&
    !user.roleConfirmed
  ) {
    return null;
  }

  return (
    <ChatProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
        <ChatWidget />
      </div>
    </ChatProvider>
  );
}
