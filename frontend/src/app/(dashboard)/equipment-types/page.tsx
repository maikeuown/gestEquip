'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { typesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { Button } from '@/components/ui/Button';
import type { EquipmentType } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function EquipmentTypesPage() {
  const { user } = useAuthStore();
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EquipmentType | null>(null);
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const load = async () => {
    setLoading(true);
    try { setTypes(await typesApi.list() as unknown as EquipmentType[]); } catch { toast.error('Erro'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar tipo?')) return;
    try { await typesApi.delete(id); toast.success('Eliminado'); load(); } catch { toast.error('Erro'); }
  };

  return (
    <div>
      <Header title="Tipos de Equipamento" />
      <div className="p-6">
        <div className="page-header">
          <h2 className="page-title">Tipos de Equipamento</h2>
          {canEdit && <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Novo Tipo</button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? <div className="text-gray-400 py-8 text-center col-span-full">A carregar...</div>
            : types.length === 0 ? <div className="text-gray-400 py-8 text-center col-span-full">Sem tipos criados</div>
            : types.map(t => (
              <div key={t.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-xl">{t.icon || '🖥️'}</div>
                    <div><div className="font-semibold text-gray-900">{t.name}</div></div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                {t.description && <p className="text-xs text-gray-500 mb-3">{t.description}</p>}
                <div className="text-center bg-gray-50 rounded-lg py-2 text-sm">
                  <div className="font-bold text-gray-900">{t._count?.equipment || 0}</div>
                  <div className="text-xs text-gray-500">Equipamentos</div>
                </div>
              </div>
            ))}
        </div>
      </div>
      {showForm && <TypeForm open={showForm} onClose={() => setShowForm(false)} type={editing} onSaved={load} />}
    </div>
  );
}

function TypeForm({ open, onClose, type, onSaved }: any) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: type || {} });
  useEffect(() => { reset(type || {}); }, [type, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (type?.id) await typesApi.update(type.id, data);
      else await typesApi.create(data);
      toast.success(type ? 'Atualizado' : 'Criado'); onSaved(); onClose();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={type ? 'Editar Tipo' : 'Novo Tipo'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput label="Nome" required {...register('name', { required: true })} error={errors.name?.message as string} />
        <FormInput label="Ícone (emoji)" {...register('icon')} placeholder="🖥️" />
        <FormTextarea label="Descrição" {...register('description')} rows={2} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isSubmitting ? 'A guardar...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
