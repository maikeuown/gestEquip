'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function Home() {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isHydrated) return;
    // Redirect based on user role
    const redirectUrl = user?.role === 'TEACHER' ? '/schedules' : '/dashboard';
    router.replace(redirectUrl);
  }, [isHydrated, user, router]);

  return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
}
