'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { Button } from '@/components/ui/Button';
import type { User } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

const roleLabels: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', TECHNICIAN: 'Técnico', TEACHER: 'Professor', STAFF: 'Funcionário' };
const roleColors: Record<string, string> = { SUPER_ADMIN: 'bg-red-100 text-red-700', ADMIN: 'bg-purple-100 text-purple-700', TECHNICIAN: 'bg-blue-100 text-blue-700', TEACHER: 'bg-green-100 text-green-700', STAFF: 'bg-gray-100 text-gray-600' };

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await usersApi.list({ role: roleFilter || undefined }) as unknown as User[]); }
    catch { toast.error('Erro ao carregar'); } finally { setLoading(false); }
  }, [roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar utilizador?')) return;
    try { await usersApi.delete(id); toast.success('Eliminado'); load(); } catch { toast.error('Erro'); }
  };

  const handleToggle = async (id: string) => {
    try { await usersApi.toggleActive(id); toast.success('Atualizado'); load(); } catch { toast.error('Erro'); }
  };

  return (
    <div>
      <Header title="Utilizadores" />
      <div className="p-6">
        <div className="page-header">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="select w-44">
            <option value="">Todos os papéis</option>
            {Object.keys(roleLabels).map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Novo Utilizador</button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Instituição</th><th>Estado</th><th>Último acesso</th><th className="text-right">Ações</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">A carregar...</td></tr>
                : users.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sem utilizadores</td></tr>
                : users.map(u => (
                  <tr key={u.id}>
                    <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">{u.firstName[0]}{u.lastName[0]}</div><div><div className="font-medium text-sm">{u.firstName} {u.lastName}</div></div></div></td>
                    <td><span className="text-sm text-gray-600">{u.email}</span></td>
                    <td><span className={`badge ${roleColors[u.role] || ''}`}>{roleLabels[u.role] || u.role}</span></td>
                    <td><span className="text-sm text-gray-500">{(u as any).institution?.shortName || '—'}</span></td>
                    <td><span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive ? 'Ativo' : 'Inativo'}</span></td>
                    <td><span className="text-xs text-gray-400">{u.lastLoginAt ? format(new Date(u.lastLoginAt), 'dd/MM/yyyy HH:mm') : '—'}</span></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleToggle(u.id)} className={`p-1.5 rounded ${u.isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>{u.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}</button>
                        <button onClick={() => { setEditing(u); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Pencil className="w-4 h-4" /></button>
                        {u.id !== me?.id && <button onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && <UserForm open={showForm} onClose={() => setShowForm(false)} user={editing} onSaved={load} />}
    </div>
  );
}

function UserForm({ open, onClose, user, onSaved }: any) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: user ? { ...user, password: '' } : {} });
  useEffect(() => { reset(user ? { ...user, password: '' } : {}); }, [user, reset]);

  const onSubmit = async (data: any) => {
    if (!data.password) delete data.password;
    try {
      if (user?.id) await usersApi.update(user.id, data);
      else await usersApi.create(data);
      toast.success(user ? 'Atualizado' : 'Criado'); onSaved(); onClose();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Editar Utilizador' : 'Novo Utilizador'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Primeiro Nome" required {...register('firstName', { required: true })} error={errors.firstName?.message as string} />
          <FormInput label="Apelido" required {...register('lastName', { required: true })} error={errors.lastName?.message as string} />
        </div>
        <FormInput label="Email" required type="email" {...register('email', { required: true })} error={errors.email?.message as string} />
        <FormInput
          label={user ? 'Nova Palavra-passe (deixar vazio para não alterar)' : 'Palavra-passe'}
          required={!user}
          type="password"
          {...register('password', { required: !user })}
          error={errors.password?.message as string}
        />
        <FormSelect label="Papel" {...register('role')}>
          <option value="STAFF">Funcionário</option>
          <option value="TEACHER">Professor</option>
          <option value="TECHNICIAN">Técnico</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </FormSelect>
        <FormInput label="Telefone" {...register('phone')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isSubmitting ? 'A guardar...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
