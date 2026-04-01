'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { reportsApi, equipmentApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const statusLabels: Record<string, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', MAINTENANCE: 'Manutenção', RETIRED: 'Retirado', LOST: 'Perdido', STOLEN: 'Roubado' };

export default function ReportsPage() {
  const [byType, setByType] = useState([]);
  const [byStatus, setByStatus] = useState([]);
  const [byRoom, setByRoom] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([reportsApi.byType(), reportsApi.byStatus(), reportsApi.byRoom(), reportsApi.trend(12)])
      .then(([bt, bs, br, tr]: any[]) => {
        setByType(bt); setByStatus(bs.map((x: any) => ({ ...x, name: statusLabels[x.status] || x.status }))); setByRoom(br); setTrend(tr);
      }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    try {
      const blob: any = await equipmentApi.exportCsv();
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a'); a.href = url; a.download = 'equipamentos.csv'; a.click();
      toast.success('Exportado com sucesso');
    } catch { toast.error('Erro ao exportar'); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <Header title="Relatórios" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button onClick={handleExport} className="btn-primary btn-sm"><Download className="w-4 h-4" /> Exportar Equipamentos (CSV)</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Equipamentos por Tipo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byType} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Qtd" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Equipamentos por Estado</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byStatus.filter((x: any) => x.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Equipamentos por Sala</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byRoom}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Qtd" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Tickets de Manutenção (12 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trend}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
