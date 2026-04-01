'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
