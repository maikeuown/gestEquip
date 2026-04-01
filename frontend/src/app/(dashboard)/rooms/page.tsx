'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, DoorOpen, Package } from 'lucide-react';
import { roomsApi } from '@/lib/api';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import type { Room } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function RoomsPage() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  const load = async () => {
    setLoading(true);
    try { setRooms(await roomsApi.list() as unknown as Room[]); } catch { toast.error('Erro'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar sala?')) return;
    try { await roomsApi.delete(id); toast.success('Eliminada'); load(); } catch { toast.error('Erro'); }
  };

  return (
    <div>
      <Header title="Salas" />
      <div className="p-6">
        <div className="page-header">
          <h2 className="page-title">Salas e Espaços</h2>
          {canEdit && <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Nova Sala</button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? <div className="text-gray-400 py-8 text-center col-span-full">A carregar...</div>
            : rooms.length === 0 ? <div className="text-gray-400 py-8 text-center col-span-full">Sem salas criadas</div>
            : rooms.map(r => (
              <Link key={r.id} href={`/rooms/${r.id}`} className="card p-5 hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer block">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><DoorOpen className="w-5 h-5 text-blue-600" /></div>
                    <div><div className="font-semibold text-gray-900">{r.name}</div><div className="text-xs text-gray-500">{r.code || ''} {r.building ? `· ${r.building}` : ''} {r.floor ? `Piso ${r.floor}` : ''}</div></div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1" onClick={e => e.preventDefault()}>
                      <button onClick={(e) => { e.stopPropagation(); setEditing(r); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                {r.description && <p className="text-sm text-gray-500 mb-2">{r.description}</p>}
                <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg py-2 text-sm">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900">{r._count?.equipment || 0}</span>
                  <span className="text-xs text-gray-500">Equipamentos</span>
                </div>
              </Link>
            ))}
        </div>
      </div>
      {showForm && <RoomForm open={showForm} onClose={() => setShowForm(false)} room={editing} onSaved={load} />}
    </div>
  );
}

function RoomForm({ open, onClose, room, onSaved }: any) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: room || {} });
  useEffect(() => { reset(room || {}); }, [room, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (room?.id) await roomsApi.update(room.id, data);
      else await roomsApi.create(data);
      toast.success(room ? 'Atualizada' : 'Criada'); onSaved(); onClose();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={room ? 'Editar Sala' : 'Nova Sala'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div><label className="label">Nome *</label><input {...register('name', { required: true })} className="input" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Código</label><input {...register('code')} className="input" /></div>
          <div><label className="label">Edifício</label><input {...register('building')} className="input" /></div>
          <div><label className="label">Piso</label><input {...register('floor')} className="input" /></div>
          <div><label className="label">Capacidade</label><input {...register('capacity', { valueAsNumber: true })} type="number" className="input" /></div>
        </div>
        <div><label className="label">Descrição</label><textarea {...register('description')} className="input" rows={2} /></div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'A guardar...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
