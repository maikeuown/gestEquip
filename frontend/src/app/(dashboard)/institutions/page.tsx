'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { institutionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';
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
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: institution || {} });
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
        <div className="col-span-2">
          <FormInput label="Nome" required {...register('name', { required: true })} error={errors.name?.message as string} />
        </div>
        <FormInput label="Abreviatura" required {...register('shortName', { required: true })} error={errors.shortName?.message as string} />
        <FormInput label="NIF" {...register('taxId')} />
        <FormInput label="Email" type="email" {...register('email')} />
        <FormInput label="Telefone" {...register('phone')} />
        <div className="col-span-2">
          <FormInput label="Morada" {...register('address')} />
        </div>
        <FormInput label="Cidade" {...register('city')} />
        <FormInput label="Código Postal" {...register('postalCode')} />
        <div className="col-span-2 flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isSubmitting ? 'A guardar...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
