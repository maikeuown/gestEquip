'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { movementsApi, equipmentApi, roomsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { Movement, Equipment, Room } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

export default function MovementsPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Movement[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, e, r] = await Promise.all([movementsApi.list({ status: statusFilter || undefined }), equipmentApi.list(), roomsApi.list()]);
      setItems(m as unknown as Movement[]); setEquipment(e as unknown as Equipment[]); setRooms(r as unknown as Room[]);
    } catch { toast.error('Erro ao carregar'); } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const canApprove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  const handleStatus = async (id: string, status: string) => {
    try { await movementsApi.updateStatus(id, status); toast.success('Atualizado'); load(); }
    catch { toast.error('Erro'); }
  };

  const typeLabels: Record<string, string> = { CHECK_IN: 'Entrada', CHECK_OUT: 'Saída', TRANSFER: 'Transferência', LOAN: 'Empréstimo', RETURN: 'Devolução' };

  return (
    <div>
      <Header title="Movimentos" />
      <div className="p-6">
        <div className="page-header">
          <div className="flex gap-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-44">
              <option value="">Todos os estados</option>
              {['PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Novo Movimento</button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Equipamento</th><th>Tipo</th><th>De</th><th>Para</th><th>Solicitado por</th><th>Estado</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">A carregar...</td></tr>
                : items.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Sem movimentos</td></tr>
                : items.map(m => (
                  <tr key={m.id}>
                    <td><div className="font-medium text-sm">{(m.equipment as any)?.name}</div></td>
                    <td><span className="text-sm">{typeLabels[m.type] || m.type}</span></td>
                    <td><span className="text-sm text-gray-500">{(m.fromRoom as any)?.name || '—'}</span></td>
                    <td><span className="text-sm text-gray-500">{(m.toRoom as any)?.name || '—'}</span></td>
                    <td><span className="text-sm">{(m.requestedBy as any)?.firstName} {(m.requestedBy as any)?.lastName}</span></td>
                    <td><Badge value={m.status} type="movement" /></td>
                    <td><span className="text-xs text-gray-400">{format(new Date(m.createdAt), 'dd/MM/yyyy')}</span></td>
                    <td>
                      {canApprove && m.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleStatus(m.id, 'APPROVED')} className="btn-primary btn-sm py-1">Aprovar</button>
                          <button onClick={() => handleStatus(m.id, 'REJECTED')} className="btn-danger btn-sm py-1">Rejeitar</button>
                        </div>
                      )}
                      {canApprove && m.status === 'APPROVED' && (
                        <button onClick={() => handleStatus(m.id, 'COMPLETED')} className="btn-secondary btn-sm">Concluir</button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && <MovementForm open={showForm} onClose={() => setShowForm(false)} equipment={equipment} rooms={rooms} onSaved={load} />}
    </div>
  );
}

function MovementForm({ open, onClose, equipment, rooms, onSaved }: any) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const onSubmit = async (data: any) => {
    try { await movementsApi.create(data); toast.success('Movimento criado'); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Novo Movimento" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div><label className="label">Equipamento *</label><select {...register('equipmentId', { required: true })} className="select"><option value="">Selecionar...</option>{equipment.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
        <div><label className="label">Tipo *</label><select {...register('type', { required: true })} className="select"><option value="">Selecionar...</option>{['CHECK_IN','CHECK_OUT','TRANSFER','LOAN','RETURN'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Sala de Origem</label><select {...register('fromRoomId')} className="select"><option value="">Nenhuma</option>{rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div><label className="label">Sala de Destino</label><select {...register('toRoomId')} className="select"><option value="">Nenhuma</option>{rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
        </div>
        <div><label className="label">Motivo</label><textarea {...register('reason')} className="input" rows={2} /></div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'A criar...' : 'Criar'}</button>
        </div>
      </form>
    </Modal>
  );
}
