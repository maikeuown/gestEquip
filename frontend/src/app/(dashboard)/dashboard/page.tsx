'use client';
import { useEffect, useState } from 'react';
import { Package, Wrench, ArrowLeftRight, Users, TrendingUp, AlertCircle, DoorOpen, ClipboardList, Bell, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { reportsApi, requestsApi, assistanceRequestsApi, notificationsApi, roomsApi, schedulesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import type { DashboardStats, MaintenanceTicket, Movement, Request, AssistanceRequest, Notification, Room, Schedule } from '@/types';
import { format } from 'date-fns';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativo', INACTIVE: 'Inativo', MAINTENANCE: 'Manutenção', RETIRED: 'Retirado', LOST: 'Perdido', STOLEN: 'Roubado'
};

const dayLabels: Record<string, string> = {
  MONDAY: 'Segunda', TUESDAY: 'Terça', WEDNESDAY: 'Quarta', THURSDAY: 'Quinta', FRIDAY: 'Sexta', SATURDAY: 'Sábado', SUNDAY: 'Domingo'
};

const todayDay = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date().getDay()] as string;

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role;

  if (role === 'TEACHER') return <TeacherDashboard />;
  if (role === 'STAFF') return <StaffDashboard />;
  return <AdminDashboard />;
}

/* ═══════════════════════════════════════════════════════
   ADMIN / TECHNICIAN / SUPER_ADMIN Dashboard (unchanged)
   ═══════════════════════════════════════════════════════ */
function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byType, setByType] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [activity, setActivity] = useState<{ recentTickets: MaintenanceTicket[]; recentMovements: Movement[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportsApi.dashboard(),
      reportsApi.byType(),
      reportsApi.byStatus(),
      reportsApi.trend(6),
      reportsApi.activity(),
    ]).then(([s, bt, bs, tr, ac]: any[]) => {
      setStats(s); setByType(bt); setByStatus(bs.map((x: any) => ({ ...x, name: statusLabels[x.status] || x.status })));
      setTrend(tr); setActivity(ac);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;

  const statCards = [
    { label: 'Total Equipamentos', value: stats?.equipment.total ?? 0, sub: `${stats?.equipment.active ?? 0} ativos`, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Em Manutenção', value: stats?.equipment.maintenance ?? 0, sub: `${stats?.tickets.open ?? 0} tickets abertos`, icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Movimentos Pendentes', value: stats?.movements.pending ?? 0, sub: 'aguardando aprovação', icon: ArrowLeftRight, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Utilizadores', value: stats?.users.total ?? 0, sub: `${stats?.users.active ?? 0} ativos`, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <div key={c.label} className="stat-card flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                <div className="text-sm font-medium text-gray-700">{c.label}</div>
                <div className="text-xs text-gray-400">{c.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary-600" /> Tendência de Manutenção</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Estado dos Equipamentos</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byStatus.filter(x => x.count > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="name">
                  {byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-orange-500" /> Tickets Recentes</h3>
              <Link href="/maintenance" className="text-xs text-primary-600 hover:underline">Ver todos</Link>
            </div>
            <div className="space-y-2">
              {activity?.recentTickets.slice(0, 5).map((t) => (
                <Link key={t.id} href={`/maintenance/${t.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{t.ticketNumber} — {t.title}</div>
                    <div className="text-xs text-gray-400">{(t.equipment as any)?.name} · {t.reportedBy?.firstName} {t.reportedBy?.lastName}</div>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </Link>
              ))}
              {!activity?.recentTickets.length && <p className="text-sm text-gray-400 text-center py-4">Sem tickets recentes</p>}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-purple-500" /> Movimentos Recentes</h3>
              <Link href="/movements" className="text-xs text-primary-600 hover:underline">Ver todos</Link>
            </div>
            <div className="space-y-2">
              {activity?.recentMovements.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{(m.equipment as any)?.name}</div>
                    <div className="text-xs text-gray-400">{m.type} · {(m.requestedBy as any)?.firstName} {(m.requestedBy as any)?.lastName}</div>
                  </div>
                  <StatusBadge status={m.status} type="movement" />
                </div>
              ))}
              {!activity?.recentMovements.length && <p className="text-sm text-gray-400 text-center py-4">Sem movimentos recentes</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TEACHER Dashboard
   ═══════════════════════════════════════════════════════ */
function TeacherDashboard() {
  const [roomsCount, setRoomsCount] = useState(0);
  const [myRequests, setMyRequests] = useState(0);
  const [myAssistance, setMyAssistance] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [todaySchedule, setTodaySchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      roomsApi.list().catch(() => []),
      requestsApi.list({ mine: 'true' }).catch(() => []),
      assistanceRequestsApi.list().catch(() => []),
      notificationsApi.unreadCount().catch(() => ({ count: 0 })),
      schedulesApi.list({ day: todayDay }).catch(() => []),
    ]).then(([rooms, reqs, assist, notifs, sched]: any[]) => {
      setRoomsCount((rooms as any[])?.length ?? 0);
      setMyRequests((reqs as any[])?.length ?? 0);
      setMyAssistance((assist as any[])?.length ?? 0);
      setUnreadNotifs((notifs as any)?.count ?? 0);
      setTodaySchedule((sched as any[]) ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;

  const widgets = [
    { label: 'Salas', value: roomsCount, sub: 'salas disponíveis', icon: DoorOpen, color: 'text-blue-600', bg: 'bg-blue-50', href: '/rooms' },
    { label: 'Requisições', value: myRequests, sub: 'as minhas requisições', icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/requests' },
    { label: 'Pedidos de Assistência', value: myAssistance, sub: 'os meus pedidos', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', href: '/assistance-requests' },
    { label: 'Notificações', value: unreadNotifs, sub: 'por ler', icon: Bell, color: 'text-red-600', bg: 'bg-red-50', href: '/notifications' },
  ];

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Bem-vindo, Professor</h2>
          <p className="text-gray-600 text-sm">Aceda rapidamente às suas salas, horário e requisições.</p>
        </div>

        {/* Widget Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {widgets.map((w) => (
            <Link key={w.label} href={w.href} className="stat-card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`w-12 h-12 rounded-xl ${w.bg} flex items-center justify-center flex-shrink-0`}>
                <w.icon className={`w-6 h-6 ${w.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{w.value}</div>
                <div className="text-sm font-medium text-gray-700">{w.label}</div>
                <div className="text-xs text-gray-400">{w.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Today's Schedule */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" /> Horário de Hoje — {dayLabels[todayDay] || todayDay}
          </h3>
          {todaySchedule.length > 0 ? (
            <div className="space-y-2">
              {todaySchedule.slice(0, 6).map((s: Schedule) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{s.subject || 'Sem disciplina'}</div>
                    <div className="text-xs text-gray-400">{(s.room as any)?.name || 'Sala'} · {s.teacher || ''}</div>
                  </div>
                  <div className="text-sm font-mono text-gray-600">{s.startTime} — {s.endTime}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Sem aulas agendadas para hoje</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STAFF Dashboard
   ═══════════════════════════════════════════════════════ */
function StaffDashboard() {
  const [roomsCount, setRoomsCount] = useState(0);
  const [myRequests, setMyRequests] = useState(0);
  const [myAssistance, setMyAssistance] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      roomsApi.list().catch(() => []),
      requestsApi.list({ mine: 'true' }).catch(() => []),
      assistanceRequestsApi.list().catch(() => []),
      notificationsApi.unreadCount().catch(() => ({ count: 0 })),
    ]).then(([rooms, reqs, assist, notifs]: any[]) => {
      setRoomsCount((rooms as any[])?.length ?? 0);
      setMyRequests((reqs as any[])?.length ?? 0);
      setMyAssistance((assist as any[])?.length ?? 0);
      setUnreadNotifs((notifs as any)?.count ?? 0);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;

  const widgets = [
    { label: 'Salas', value: roomsCount, sub: 'salas disponíveis', icon: DoorOpen, color: 'text-blue-600', bg: 'bg-blue-50', href: '/rooms' },
    { label: 'Requisições', value: myRequests, sub: 'as minhas requisições', icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/requests' },
    { label: 'Pedidos de Assistência', value: myAssistance, sub: 'os meus pedidos', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', href: '/assistance-requests' },
    { label: 'Notificações', value: unreadNotifs, sub: 'por ler', icon: Bell, color: 'text-red-600', bg: 'bg-red-50', href: '/notifications' },
  ];

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="card p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Bem-vindo, Funcionário</h2>
          <p className="text-gray-600 text-sm">Gerir salas, requisições e pedidos de assistência.</p>
        </div>

        {/* Widget Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {widgets.map((w) => (
            <Link key={w.label} href={w.href} className="stat-card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`w-12 h-12 rounded-xl ${w.bg} flex items-center justify-center flex-shrink-0`}>
                <w.icon className={`w-6 h-6 ${w.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{w.value}</div>
                <div className="text-sm font-medium text-gray-700">{w.label}</div>
                <div className="text-xs text-gray-400">{w.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared sub-components
   ═══════════════════════════════════════════════════════ */
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = { LOW: 'bg-gray-100 text-gray-600', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };
  const labels: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' };
  return <span className={`badge ${map[priority] || ''}`}>{labels[priority] || priority}</span>;
}

function StatusBadge({ status, type }: { status: string; type: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado', COMPLETED: 'Completo', CANCELLED: 'Cancelado' };
  return <span className={`badge ${map[status] || ''}`}>{labels[status] || status}</span>;
}
