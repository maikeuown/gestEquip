'use client';
import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { maintenanceApi, usersApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { useForm } from 'react-hook-form';
import type { MaintenanceTicket, Message } from '@/types';

export default function MaintenanceDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<MaintenanceTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = async () => {
    try {
      const [t, u] = await Promise.all([maintenanceApi.get(params.id), usersApi.list({ role: 'TECHNICIAN' })]);
      setTicket(t as unknown as MaintenanceTicket); setUsers(u as unknown as any[]);
    } catch { toast.error('Erro ao carregar ticket'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [params.id]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [(ticket as any)?.messages?.length]);

  const handleUpdate = async (data: any) => {
    try { await maintenanceApi.update(params.id, data); toast.success('Atualizado'); setEditing(false); load(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  };

  const handleSendMessage = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try { await maintenanceApi.addMessage(params.id, msg); setMsg(''); load(); }
    catch { toast.error('Erro ao enviar'); } finally { setSending(false); }
  };

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!ticket) return <div className="p-6 text-gray-500">Ticket não encontrado</div>;

  return (
    <div>
      <Header title={ticket.ticketNumber} />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/maintenance" className="btn-secondary btn-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{ticket.ticketNumber} — {ticket.title}</h2>
            <div className="flex gap-2 mt-1">
              <Badge value={ticket.priority} type="priority" />
              <Badge value={ticket.status} type="maintenance" />
              {ticket.isPreventive && <span className="badge bg-purple-100 text-purple-700">Preventiva</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Descrição</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              {ticket.resolution && (<div className="mt-4 p-3 bg-green-50 rounded-lg"><p className="text-sm font-medium text-green-800">Resolução:</p><p className="text-sm text-green-700">{ticket.resolution}</p></div>)}
            </div>

            {canEdit && editing && (
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Atualizar Ticket</h3>
                <form onSubmit={handleSubmit(handleUpdate)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormSelect label="Estado" {...register('status')} defaultValue={ticket.status}>
                      {['OPEN','IN_PROGRESS','WAITING_PARTS','RESOLVED','CLOSED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                    </FormSelect>
                    <FormSelect label="Prioridade" {...register('priority')} defaultValue={ticket.priority}>
                      {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
                    </FormSelect>
                    <FormSelect label="Atribuir a" {...register('assignedToId')} defaultValue={ticket.assignedToId || ''}>
                      <option value="">Ninguém</option>
                      {users.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                    </FormSelect>
                    <FormInput label="Custo Real (€)" {...register('actualCost', { valueAsNumber: true })} defaultValue={ticket.actualCost as any} type="number" step="0.01" />
                  </div>
                  <FormTextarea label="Resolução" {...register('resolution')} defaultValue={ticket.resolution || ''} rows={2} />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={isSubmitting}>Guardar</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
                  </div>
                </form>
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-semibold mb-4">Mensagens</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {(ticket as any).messages?.map((m: Message) => (
                  <div key={m.id} className={`flex gap-3 ${m.senderId === user?.id ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                      {(m.sender as any)?.firstName?.[0]}
                    </div>
                    <div className={`max-w-[75%] ${m.senderId === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`rounded-xl px-3 py-2 text-sm ${m.senderId === user?.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
                      <span className="text-xs text-gray-400 mt-0.5">{format(new Date(m.createdAt), 'HH:mm dd/MM')}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>
              <div className="flex gap-2">
                <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} className="input flex-1" placeholder="Escrever mensagem..." />
                <button onClick={handleSendMessage} disabled={sending || !msg.trim()} className="btn-primary"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5 space-y-3 text-sm">
              <h3 className="font-semibold">Detalhes</h3>
              <div className="space-y-2">
                <Row label="Equipamento" value={(ticket.equipment as any)?.name} />
                <Row label="Reportado por" value={ticket.reportedBy ? `${(ticket.reportedBy as any).firstName} ${(ticket.reportedBy as any).lastName}` : '—'} />
                <Row label="Atribuído a" value={ticket.assignedTo ? `${(ticket.assignedTo as any).firstName} ${(ticket.assignedTo as any).lastName}` : '—'} />
                <Row label="Data Prevista" value={ticket.scheduledDate ? format(new Date(ticket.scheduledDate), 'dd/MM/yyyy') : '—'} />
                <Row label="Custo Est." value={ticket.estimatedCost ? `€${ticket.estimatedCost}` : '—'} />
                <Row label="Custo Real" value={ticket.actualCost ? `€${ticket.actualCost}` : '—'} />
                <Row label="Criado" value={format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')} />
                {ticket.resolvedAt && <Row label="Resolvido" value={format(new Date(ticket.resolvedAt), 'dd/MM/yyyy HH:mm')} />}
              </div>
            </div>
            {canEdit && !editing && <button onClick={() => setEditing(true)} className="btn-primary w-full">Editar Ticket</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return <div className="flex justify-between"><span className="text-gray-500">{label}:</span><span className="font-medium">{value || '—'}</span></div>;
}
