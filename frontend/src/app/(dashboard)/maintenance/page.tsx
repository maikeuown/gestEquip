'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Wrench } from 'lucide-react';
import { maintenanceApi, equipmentApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { MaintenanceTicket, Equipment, User } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

export default function MaintenancePage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<MaintenanceTicket[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, e, u, s] = await Promise.all([
        maintenanceApi.list({ search: search || undefined, status: statusFilter || undefined, priority: priorityFilter || undefined }),
        equipmentApi.list(),
        usersApi.list({ role: 'TECHNICIAN' }),
        maintenanceApi.stats(),
      ]);
      setItems(t as unknown as MaintenanceTicket[]); setEquipment(e as unknown as Equipment[]); setUsers(u as unknown as User[]); setStats(s);
    } catch { toast.error('Erro ao carregar'); } finally { setLoading(false); }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Header title="Manutenção" />
      <div className="p-6 space-y-5">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[['Abertos', stats.open, 'text-blue-600', 'bg-blue-50'], ['Em Curso', stats.inProgress, 'text-yellow-600', 'bg-yellow-50'], ['Resolvidos', stats.resolved, 'text-green-600', 'bg-green-50'], ['Aguarda Peças', stats.waitingParts, 'text-orange-600', 'bg-orange-50']].map(([l, v, c, bg]) => (
              <div key={l as string} className={`card p-4 flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}><Wrench className={`w-5 h-5 ${c}`} /></div>
                <div><div className="text-xl font-bold">{v}</div><div className="text-xs text-gray-500">{l}</div></div>
              </div>
            ))}
          </div>
        )}

        <div className="page-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-56" placeholder="Pesquisar..." />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-44">
              <option value="">Todos os estados</option>
              {['OPEN','IN_PROGRESS','WAITING_PARTS','RESOLVED','CLOSED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="select w-36">
              <option value="">Todas prioridades</option>
              {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Novo Ticket</button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Ticket</th><th>Equipamento</th><th>Prioridade</th><th>Estado</th><th>Atribuído a</th><th>Data</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">A carregar...</td></tr>
                : items.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum ticket encontrado</td></tr>
                : items.map(t => (
                  <tr key={t.id}>
                    <td><div className="font-medium text-gray-900">{t.ticketNumber}</div><div className="text-xs text-gray-500 truncate max-w-xs">{t.title}</div></td>
                    <td><span className="text-sm">{(t.equipment as any)?.name || '—'}</span></td>
                    <td><Badge value={t.priority} type="priority" /></td>
                    <td><Badge value={t.status} type="maintenance" /></td>
                    <td><span className="text-sm">{t.assignedTo ? `${(t.assignedTo as any).firstName} ${(t.assignedTo as any).lastName}` : '—'}</span></td>
                    <td><span className="text-xs text-gray-400">{format(new Date(t.createdAt), 'dd/MM/yyyy')}</span></td>
                    <td><Link href={`/maintenance/${t.id}`} className="text-xs text-primary-600 hover:underline">Ver</Link></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && <MaintenanceForm open={showForm} onClose={() => setShowForm(false)} equipment={equipment} users={users} onSaved={load} />}
    </div>
  );
}

function MaintenanceForm({ open, onClose, equipment, users, onSaved }: any) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async (data: any) => {
    try { await maintenanceApi.create(data); toast.success('Ticket criado'); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Novo Ticket de Manutenção" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSelect label="Equipamento" required {...register('equipmentId', { required: true })} error={errors.equipmentId?.message as string}>
          <option value="">Selecionar...</option>
          {equipment.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.serialNumber || 'sem série'})</option>)}
        </FormSelect>
        <FormInput label="Título" required {...register('title', { required: true })} error={errors.title?.message as string} />
        <FormTextarea label="Descrição" required {...register('description', { required: true })} error={errors.description?.message as string} rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <FormSelect label="Prioridade" {...register('priority')}>
            {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
          <FormSelect label="Atribuir a" {...register('assignedToId')}>
            <option value="">Ninguém</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </FormSelect>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Data Prevista" {...register('scheduledDate')} type="date" />
          <FormInput label="Custo Estimado (€)" {...register('estimatedCost', { valueAsNumber: true })} type="number" step="0.01" />
        </div>
        <div className="flex items-center gap-2">
          <input {...register('isPreventive')} type="checkbox" id="prev" className="rounded" />
          <label htmlFor="prev" className="text-sm text-gray-700">Manutenção preventiva</label>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isSubmitting ? 'A criar...' : 'Criar Ticket'}</Button>
        </div>
      </form>
    </Modal>
  );
}
