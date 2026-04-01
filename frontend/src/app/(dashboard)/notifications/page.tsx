'use client';
import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import type { Notification } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';

const typeIcons: Record<string, string> = { INFO: '💬', WARNING: '⚠️', ERROR: '❌', SUCCESS: '✅', MAINTENANCE: '🔧', MOVEMENT: '↔️', TICKET: '🎫', SYSTEM: '⚙️' };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await notificationsApi.list({ unread: unreadOnly ? 'true' : undefined }) as unknown as Notification[]); }
    catch { toast.error('Erro'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [unreadOnly]);

  const markRead = async (id: string) => {
    try { await notificationsApi.markRead(id); load(); } catch {}
  };

  const markAll = async () => {
    try { await notificationsApi.markAllRead(); toast.success('Todas marcadas como lidas'); load(); } catch {}
  };

  const del = async (id: string) => {
    try { await notificationsApi.delete(id); load(); } catch {}
  };

  return (
    <div>
      <Header title="Notificações" />
      <div className="p-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} className="rounded" />
              Só não lidas
            </label>
          </div>
          <button onClick={markAll} className="btn-secondary btn-sm"><CheckCheck className="w-4 h-4" /> Marcar todas como lidas</button>
        </div>

        <div className="space-y-2">
          {loading ? <div className="text-gray-400 py-8 text-center">A carregar...</div>
            : items.length === 0 ? (
              <div className="card p-12 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Sem notificações</p>
              </div>
            ) : items.map(n => (
              <div key={n.id} className={clsx('card p-4 flex items-start gap-4 transition-colors', !n.isRead && 'border-l-4 border-l-primary-500 bg-primary-50/30')}>
                <div className="text-2xl flex-shrink-0">{typeIcons[n.type] || '🔔'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={clsx('font-medium text-sm', !n.isRead && 'text-gray-900', n.isRead && 'text-gray-600')}>{n.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{n.message}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.isRead && <button onClick={() => markRead(n.id)} className="p-1 text-gray-400 hover:text-primary-600 rounded text-xs">✓</button>}
                      <button onClick={() => del(n.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), 'dd/MM/yyyy HH:mm')}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
