'use client';
import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { requestsApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import type { Request } from '@/types';

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const [req, setReq] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const load = async () => {
    try { setReq(await requestsApi.get(params.id) as unknown as Request); }
    catch { toast.error('Erro ao carregar'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [params.id]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [(req as any)?.messages?.length]);

  const handleSendMessage = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try { await requestsApi.addMessage(params.id, msg); setMsg(''); load(); }
    catch { toast.error('Erro ao enviar'); } finally { setSending(false); }
  };

  const canApprove = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const handleStatus = async (status: string) => {
    try { await requestsApi.update(params.id, { status }); toast.success('Atualizado'); load(); }
    catch { toast.error('Erro'); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!req) return <div className="p-6 text-gray-500">Pedido não encontrado</div>;

  return (
    <div>
      <Header title={req.title} />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/requests" className="btn-secondary btn-sm"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{req.title}</h2>
            <Badge value={req.status} type="request" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Descrição</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.description}</p>
              {req.notes && <div className="mt-4 p-3 bg-gray-50 rounded"><p className="text-xs font-medium text-gray-500">Notas:</p><p className="text-sm">{req.notes}</p></div>}
              {req.approvalNotes && <div className="mt-2 p-3 bg-blue-50 rounded"><p className="text-xs font-medium text-blue-600">Notas de aprovação:</p><p className="text-sm text-blue-700">{req.approvalNotes}</p></div>}
            </div>

            {canApprove && req.status === 'PENDING' && (
              <div className="flex gap-3">
                <button onClick={() => handleStatus('APPROVED')} className="btn-primary">Aprovar Pedido</button>
                <button onClick={() => handleStatus('REJECTED')} className="btn-danger">Rejeitar Pedido</button>
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-semibold mb-4">Mensagens</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {(req as any).messages?.map((m: any) => (
                  <div key={m.id} className={`flex gap-3 ${m.senderId === user?.id ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">{m.sender?.firstName?.[0]}</div>
                    <div className={`max-w-[75%] flex flex-col ${m.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-xl px-3 py-2 text-sm ${m.senderId === user?.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
                      <span className="text-xs text-gray-400 mt-0.5">{format(new Date(m.createdAt), 'HH:mm dd/MM')}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>
              <div className="flex gap-2">
                <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="input flex-1" placeholder="Escrever mensagem..." />
                <button onClick={handleSendMessage} disabled={sending || !msg.trim()} className="btn-primary"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-3 text-sm h-fit">
            <h3 className="font-semibold">Detalhes</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Solicitado por:</span><span className="font-medium">{(req.createdBy as any)?.firstName} {(req.createdBy as any)?.lastName}</span></div>
              {req.approvedBy && <div className="flex justify-between"><span className="text-gray-500">Processado por:</span><span className="font-medium">{(req.approvedBy as any)?.firstName} {(req.approvedBy as any)?.lastName}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Criado:</span><span>{format(new Date(req.createdAt), 'dd/MM/yyyy')}</span></div>
              {req.dueDate && <div className="flex justify-between"><span className="text-gray-500">Prazo:</span><span>{format(new Date(req.dueDate), 'dd/MM/yyyy')}</span></div>}
              {req.completedAt && <div className="flex justify-between"><span className="text-gray-500">Concluído:</span><span>{format(new Date(req.completedAt), 'dd/MM/yyyy')}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
