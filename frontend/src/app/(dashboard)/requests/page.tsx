'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { requestsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Request } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import Link from 'next/link';

export default function RequestsPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await requestsApi.list({ status: statusFilter || undefined, mine: mineOnly ? 'true' : undefined });
      setItems(r as unknown as Request[]);
    } catch { toast.error('Erro ao carregar'); } finally { setLoading(false); }
  }, [statusFilter, mineOnly]);

  useEffect(() => { load(); }, [load]);

  const canApprove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const handleStatus = async (id: string, status: string) => {
    try { await requestsApi.update(id, { status }); toast.success('Atualizado'); load(); }
    catch { toast.error('Erro'); }
  };

  return (
    <div>
      <Header title="Requisições" />
      <div className="p-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-44">
              <option value="">Todos os estados</option>
              {['PENDING','APPROVED','REJECTED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} className="rounded" />
              Os meus pedidos
            </label>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Novo Pedido</button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Título</th><th>Solicitado por</th><th>Estado</th><th>Data</th><th>Prazo</th><th>Ações</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">A carregar...</td></tr>
                : items.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sem pedidos</td></tr>
                : items.map(r => (
                  <tr key={r.id}>
                    <td><Link href={`/requests/${r.id}`} className="font-medium text-primary-600 hover:underline">{r.title}</Link></td>
                    <td><span className="text-sm">{(r.createdBy as any)?.firstName} {(r.createdBy as any)?.lastName}</span></td>
                    <td><Badge value={r.status} type="request" /></td>
                    <td><span className="text-xs text-gray-400">{format(new Date(r.createdAt), 'dd/MM/yyyy')}</span></td>
                    <td><span className="text-xs text-gray-400">{r.dueDate ? format(new Date(r.dueDate), 'dd/MM/yyyy') : '—'}</span></td>
                    <td>
                      {canApprove && r.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleStatus(r.id, 'APPROVED')} className="btn-primary btn-sm py-1">Aprovar</button>
                          <button onClick={() => handleStatus(r.id, 'REJECTED')} className="btn-danger btn-sm py-1">Rejeitar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && <RequestForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

function RequestForm({ open, onClose, onSaved }: any) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const onSubmit = async (data: any) => {
    try { await requestsApi.create(data); toast.success('Pedido criado'); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nova Requisição" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput label="Título" required {...register('title', { required: true })} error={errors.title?.message as string} />
        <FormTextarea label="Descrição" required {...register('description', { required: true })} error={errors.description?.message as string} rows={4} />
        <FormInput label="Prazo" {...register('dueDate')} type="date" />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isSubmitting ? 'A criar...' : 'Criar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
