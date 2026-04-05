'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Monitor, LayoutDashboard, Package, Wrench, ArrowLeftRight, ClipboardList,
  Building2, Users, DoorOpen, Tag, BarChart3, Bell, LogOut, Settings, FileText, Shield, Building
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import { disconnectSocket } from '@/hooks/useSocket';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN', 'TEACHER', 'STAFF'] },
  { href: '/equipment', icon: Package, label: 'Equipamentos', roles: ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN', 'STAFF'] },
  { href: '/maintenance', icon: Wrench, label: 'Manutenção', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
  { href: '/assistance-requests', icon: Wrench, label: 'Manutenção', roles: ['TECHNICIAN'] },
  { href: '/movements', icon: ArrowLeftRight, label: 'Movimentos', roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
  { href: '/requests', icon: ClipboardList, label: 'Requisições', roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF'] },
  { href: '/rooms', icon: DoorOpen, label: 'Salas', roles: ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN', 'TEACHER', 'STAFF'] },
  { href: '/schedules', icon: Monitor, label: 'Horários', roles: ['SUPER_ADMIN', 'ADMIN', 'TEACHER'] },
  { href: '/assistance-requests', icon: ClipboardList, label: 'Pedidos Assistência', roles: ['TEACHER', 'STAFF'] },
  { href: '/equipment-types', icon: Tag, label: 'Tipos', roles: ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'] },
  { href: '/reports', icon: BarChart3, label: 'Relatórios', roles: ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'] },
  { href: '/diagrama', icon: Building, label: 'Diagrama do Edifício', roles: ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'] },
  { href: '/notifications', icon: Bell, label: 'Notificações', roles: ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN', 'TEACHER', 'STAFF'] },
];

const adminItems = [
  { href: '/users', icon: Users, label: 'Utilizadores' },
  { href: '/institutions', icon: Building2, label: 'Instituições' },
  { href: '/audit', icon: Shield, label: 'Auditoria' },
  { href: '/settings', icon: Settings, label: 'Definições' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    disconnectSocket();
    clearAuth();
    router.replace('/login');
    toast.success('Sessão terminada');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-none">SGEI</div>
          <div className="text-slate-500 text-xs mt-0.5 leading-none truncate max-w-[120px]">{user?.institution?.shortName || 'Sistema'}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label, roles }: any) =>
          (!roles || roles.includes(user?.role)) && (
            <Link key={href} href={href} className={clsx('sidebar-item', isActive(href) && 'active')}>
              <Icon /> <span>{label}</span>
            </Link>
          )
        )}

        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Administração</span>
            </div>
            {adminItems.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className={clsx('sidebar-item', isActive(href) && 'active')}>
                <Icon /> <span>{label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-slate-500 text-xs truncate">{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-item w-full hover:bg-red-900/30 hover:text-red-400">
          <LogOut className="w-4 h-4" /> <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
