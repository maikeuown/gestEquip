'use client';
import { useEffect, useState } from 'react';
import { auditApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try { setLogs(await auditApi.list({ entity: entityFilter || undefined, limit: 200 }) as unknown as any[]); }
    catch { toast.error('Erro'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [entityFilter]);

  return (
    <div>
      <Header title="Auditoria" />
      <div className="p-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-500" />
            <span className="text-gray-600 text-sm">Registo de todas as ações no sistema</span>
          </div>
          <input value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="input w-44" placeholder="Filtrar por entidade..." />
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Data</th><th>Utilizador</th><th>Ação</th><th>Entidade</th><th>IP</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">A carregar...</td></tr>
                : logs.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sem registos</td></tr>
                : logs.map(l => (
                  <tr key={l.id}>
                    <td><span className="text-xs text-gray-500">{format(new Date(l.createdAt), 'dd/MM/yyyy HH:mm:ss')}</span></td>
                    <td><span className="text-sm">{l.user ? `${l.user.firstName} ${l.user.lastName}` : 'Sistema'}</span></td>
                    <td><span className="text-sm font-medium">{l.action}</span></td>
                    <td><span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{l.entity}{l.entityId ? ` #${l.entityId.slice(0, 8)}` : ''}</span></td>
                    <td><span className="text-xs text-gray-400">{l.ipAddress || '—'}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
