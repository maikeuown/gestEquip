'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Plus, Save, X, Package, DoorOpen, Eye } from 'lucide-react';
import { roomsApi, equipmentApi, typesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { Room, Equipment, EquipmentType } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState(false);
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipment | null>(null);

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roomData, equipData, typesData, roomsData] = await Promise.all([
        roomsApi.get(id),
        equipmentApi.list({ roomId: id }),
        typesApi.list(),
        roomsApi.list(),
      ]);
      setRoom(roomData as unknown as Room);
      setEquipment(equipData as unknown as Equipment[]);
      setTypes(typesData as unknown as EquipmentType[]);
      setAllRooms(roomsData as unknown as Room[]);
    } catch {
      toast.error('Erro ao carregar sala');
      router.push('/rooms');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteRoom = async () => {
    if (!confirm('Eliminar esta sala? Todos os equipamentos serão desassociados.')) return;
    try {
      await roomsApi.delete(id);
      toast.success('Sala eliminada');
      router.push('/rooms');
    } catch { toast.error('Erro ao eliminar sala'); }
  };

  const handleDeleteEquip = async (equipId: string) => {
    if (!confirm('Eliminar este equipamento?')) return;
    try {
      await equipmentApi.delete(equipId);
      toast.success('Equipamento eliminado');
      load();
    } catch { toast.error('Erro ao eliminar'); }
  };

  const handleRemoveFromRoom = async (equip: Equipment) => {
    if (!confirm(`Remover "${equip.name}" desta sala?`)) return;
    try {
      await equipmentApi.update(equip.id, { roomId: null });
      toast.success('Equipamento removido da sala');
      load();
    } catch { toast.error('Erro ao remover'); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!room) return null;

  return (
    <div>
      <Header title={room.name} />
      <div className="p-6 space-y-6">
        {/* Back button */}
        <button onClick={() => router.push('/rooms')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar às Salas
        </button>

        {/* Room Info Card */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <DoorOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{room.name}</h2>
                <p className="text-sm text-gray-500">
                  {[room.code, room.building && `Edifício ${room.building}`, room.floor && `Piso ${room.floor}`].filter(Boolean).join(' · ') || 'Sem localização'}
                </p>
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button onClick={() => setEditingRoom(true)} className="btn-secondary btn-sm"><Pencil className="w-4 h-4" /> Editar</button>
                <button onClick={handleDeleteRoom} className="btn-sm text-red-600 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Eliminar</button>
              </div>
            )}
          </div>
          {room.description && <p className="text-sm text-gray-600 mb-4">{room.description}</p>}
          <div className="flex gap-6 text-sm">
            {room.capacity && (
              <div className="bg-gray-50 rounded-lg px-4 py-2">
                <div className="font-bold text-gray-900">{room.capacity}</div>
                <div className="text-xs text-gray-500">Capacidade</div>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg px-4 py-2">
              <div className="font-bold text-gray-900">{equipment.length}</div>
              <div className="text-xs text-gray-500">Equipamentos</div>
            </div>
          </div>
        </div>

        {/* Equipment List */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Package className="w-5 h-5 text-gray-400" /> Equipamentos nesta Sala</h3>
            {canEdit && (
              <button onClick={() => { setEditingEquip(null); setShowEquipForm(true); }} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Adicionar</button>
            )}
          </div>
          {equipment.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Nenhum equipamento nesta sala</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {equipment.map(eq => (
                <div key={eq.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{eq.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {eq.brand && <span>{eq.brand} {eq.model}</span>}
                      {eq.serialNumber && <span className="font-mono">SN: {eq.serialNumber}</span>}
                      {(eq.equipmentType as any)?.name && <span>· {(eq.equipmentType as any).name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge value={eq.status} type="equipment" />
                    <Link href={`/equipment/${eq.id}`} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Eye className="w-4 h-4" /></Link>
                    {canEdit && (
                      <>
                        <button onClick={() => { setEditingEquip(eq); setShowEquipForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleRemoveFromRoom(eq)} className="p-1.5 text-gray-400 hover:text-yellow-600 rounded" title="Remover da sala"><X className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteEquip(eq.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Room Modal */}
      {editingRoom && (
        <RoomEditForm
          open={editingRoom}
          onClose={() => setEditingRoom(false)}
          room={room}
          onSaved={() => { setEditingRoom(false); load(); }}
        />
      )}

      {/* Add/Edit Equipment Modal */}
      {showEquipForm && (
        <EquipmentInRoomForm
          open={showEquipForm}
          onClose={() => setShowEquipForm(false)}
          equipment={editingEquip}
          roomId={id}
          types={types}
          rooms={allRooms}
          onSaved={() => { setShowEquipForm(false); load(); }}
        />
      )}
    </div>
  );
}

function RoomEditForm({ open, onClose, room, onSaved }: { open: boolean; onClose: () => void; room: Room; onSaved: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: room });

  const onSubmit = async (data: any) => {
    try {
      await roomsApi.update(room.id, data);
      toast.success('Sala atualizada');
      onSaved();
    } catch (e: any) { toast.error(e.message || 'Erro ao atualizar'); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar Sala" size="md">
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
          <button type="submit" disabled={isSubmitting} className="btn-primary"><Save className="w-4 h-4" /> {isSubmitting ? 'A guardar...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function EquipmentInRoomForm({ open, onClose, equipment, roomId, types, rooms, onSaved }: {
  open: boolean; onClose: () => void; equipment: Equipment | null; roomId: string;
  types: EquipmentType[]; rooms: Room[]; onSaved: () => void;
}) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: equipment ? { ...equipment, roomId } : { roomId } });
  useEffect(() => { reset(equipment ? { ...equipment, roomId } : { roomId }); }, [equipment, roomId, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (equipment?.id) await equipmentApi.update(equipment.id, data);
      else await equipmentApi.create(data);
      toast.success(equipment ? 'Atualizado' : 'Criado');
      onSaved();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={equipment ? 'Editar Equipamento' : 'Adicionar Equipamento à Sala'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label">Nome *</label><input {...register('name', { required: true })} className="input" /></div>
        <div><label className="label">Tipo *</label><select {...register('equipmentTypeId', { required: true })} className="select"><option value="">Selecionar...</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className="label">Sala</label><select {...register('roomId')} className="select"><option value="">Sem sala</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
        <div><label className="label">Marca</label><input {...register('brand')} className="input" /></div>
        <div><label className="label">Modelo</label><input {...register('model')} className="input" /></div>
        <div><label className="label">Nº Série</label><input {...register('serialNumber')} className="input" /></div>
        <div><label className="label">Nº Inventário</label><input {...register('inventoryNumber')} className="input" /></div>
        <div><label className="label">Estado</label><select {...register('status')} className="select">{['ACTIVE','INACTIVE','MAINTENANCE','RETIRED','LOST','STOLEN'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className="label">Data Aquisição</label><input {...register('acquisitionDate')} type="date" className="input" /></div>
        <div className="col-span-2"><label className="label">Notas</label><textarea {...register('notes')} className="input" rows={2} /></div>
        <div className="col-span-2 flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'A guardar...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
