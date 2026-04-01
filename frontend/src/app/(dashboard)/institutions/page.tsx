'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { institutionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import type { Institution } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function InstitutionsPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r: any = await institutionsApi.list(); setItems(Array.isArray(r) ? r : [r]); }
    catch { toast.error('Erro'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar instituição?')) return;
    try { await institutionsApi.delete(id); toast.success('Eliminada'); load(); } catch { toast.error('Erro'); }
  };

  return (
    <div>
      <Header title="Instituições" />
      <div className="p-6">
        <div className="page-header">
          <h2 className="page-title">Instituições</h2>
          {user?.role === 'SUPER_ADMIN' && <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Nova Instituição</button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? <div className="text-gray-400 py-8 text-center col-span-full">A carregar...</div>
            : items.map(inst => (
              <div key={inst.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><Building2 className="w-5 h-5 text-primary-600" /></div>
                    <div><div className="font-semibold text-gray-900">{inst.name}</div><div className="text-xs text-gray-500">{inst.shortName}</div></div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(inst); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Pencil className="w-4 h-4" /></button>
                    {user?.role === 'SUPER_ADMIN' && <button onClick={() => handleDelete(inst.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {inst.email && <div>✉ {inst.email}</div>}
                  {inst.phone && <div>📞 {inst.phone}</div>}
                  {inst.city && <div>📍 {inst.city}</div>}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="bg-gray-50 rounded-lg py-2"><div className="font-bold text-gray-900">{(inst as any)._count?.users || 0}</div><div className="text-xs text-gray-500">Utilizadores</div></div>
                  <div className="bg-gray-50 rounded-lg py-2"><div className="font-bold text-gray-900">{(inst as any)._count?.equipment || 0}</div><div className="text-xs text-gray-500">Equipamentos</div></div>
                </div>
              </div>
            ))}
        </div>
      </div>
      {showForm && <InstitutionForm open={showForm} onClose={() => setShowForm(false)} institution={editing} onSaved={load} />}
    </div>
  );
}

function InstitutionForm({ open, onClose, institution, onSaved }: any) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: institution || {} });
  useEffect(() => { reset(institution || {}); }, [institution, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (institution?.id) await institutionsApi.update(institution.id, data);
      else await institutionsApi.create(data);
      toast.success(institution ? 'Atualizada' : 'Criada'); onSaved(); onClose();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={institution ? 'Editar Instituição' : 'Nova Instituição'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label">Nome *</label><input {...register('name', { required: true })} className="input" /></div>
        <div><label className="label">Abreviatura *</label><input {...register('shortName', { required: true })} className="input" /></div>
        <div><label className="label">NIF</label><input {...register('taxId')} className="input" /></div>
        <div><label className="label">Email</label><input {...register('email')} type="email" className="input" /></div>
        <div><label className="label">Telefone</label><input {...register('phone')} className="input" /></div>
        <div className="col-span-2"><label className="label">Morada</label><input {...register('address')} className="input" /></div>
        <div><label className="label">Cidade</label><input {...register('city')} className="input" /></div>
        <div><label className="label">Código Postal</label><input {...register('postalCode')} className="input" /></div>
        <div className="col-span-2 flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'A guardar...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
