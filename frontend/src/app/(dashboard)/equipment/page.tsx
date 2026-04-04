'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Download, Upload, QrCode, Pencil, Trash2, Eye, FileSpreadsheet, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { equipmentApi, typesApi, roomsApi } from '@/lib/api';
import * as XLSX from 'xlsx';
import { useAuthStore } from '@/store/auth';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { Button } from '@/components/ui/Button';
import type { Equipment, EquipmentType, Room } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

export default function EquipmentPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Equipment[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [showQr, setShowQr] = useState<{ name: string; qr: string } | null>(null);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eq, t, r] = await Promise.all([
        equipmentApi.list({ search: search || undefined, status: statusFilter || undefined, typeId: typeFilter || undefined }),
        typesApi.list(),
        roomsApi.list(),
      ]);
      setItems(eq as unknown as Equipment[]); setTypes(t as unknown as EquipmentType[]); setRooms(r as unknown as Room[]);
    } catch (e) { toast.error('Erro ao carregar equipamentos'); }
    finally { setLoading(false); }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar equipamento?')) return;
    try { await equipmentApi.delete(id); toast.success('Eliminado'); load(); } catch { toast.error('Erro'); }
  };

  const handleQr = async (eq: Equipment) => {
    try { const r: any = await equipmentApi.getQr(eq.id); setShowQr({ name: eq.name, qr: r.qrCode }); } catch { toast.error('Erro ao gerar QR'); }
  };

  const handleExport = async () => {
    try {
      const blob: any = await equipmentApi.exportCsv();
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a'); a.href = url; a.download = 'equipment.csv'; a.click();
    } catch { toast.error('Erro ao exportar'); }
  };

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  return (
    <div>
      <Header title="Equipamentos" />
      <div className="p-6">
        <div className="page-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 w-56" placeholder="Pesquisar..." />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-44">
              <option value="">Todos os estados</option>
              {['ACTIVE','INACTIVE','MAINTENANCE','RETIRED','LOST','STOLEN'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select w-44">
              <option value="">Todos os tipos</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {canEdit && <button onClick={() => setShowImport(true)} className="btn-secondary btn-sm"><Upload className="w-4 h-4" /> Importar</button>}
            <button onClick={handleExport} className="btn-secondary btn-sm"><Download className="w-4 h-4" /> Exportar</button>
            {canEdit && <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Adicionar</button>}
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr><th>Nome / Marca</th><th>Tipo</th><th>Nº Série</th><th>Sala</th><th>Estado</th><th>Atribuído a</th><th className="text-right">Ações</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">A carregar...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum equipamento encontrado</td></tr>
              ) : items.map(eq => (
                <tr key={eq.id}>
                  <td><div className="font-medium text-gray-900">{eq.name}</div><div className="text-xs text-gray-400">{eq.brand} {eq.model}</div></td>
                  <td><span className="text-sm">{(eq.equipmentType as any)?.name || '—'}</span></td>
                  <td><span className="text-sm font-mono">{eq.serialNumber || '—'}</span></td>
                  <td><span className="text-sm">{(eq.room as any)?.name || '—'}</span></td>
                  <td><Badge value={eq.status} type="equipment" /></td>
                  <td><span className="text-sm">{eq.assignedTo ? `${(eq.assignedTo as any).firstName} ${(eq.assignedTo as any).lastName}` : '—'}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/equipment/${eq.id}`} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Eye className="w-4 h-4" /></Link>
                      <button onClick={() => handleQr(eq)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><QrCode className="w-4 h-4" /></button>
                      {canEdit && <button onClick={() => { setEditing(eq); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Pencil className="w-4 h-4" /></button>}
                      {canEdit && <button onClick={() => handleDelete(eq.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showImport && <ImportModal open={showImport} onClose={() => setShowImport(false)} types={types} rooms={rooms} onImported={load} />}
      {showForm && <EquipmentForm open={showForm} onClose={() => setShowForm(false)} equipment={editing} types={types} rooms={rooms} onSaved={load} />}
      {showQr && (
        <Modal open={!!showQr} onClose={() => setShowQr(null)} title={`QR Code — ${showQr.name}`} size="sm">
          <div className="flex flex-col items-center gap-4">
            <img src={showQr.qr} alt="QR Code" className="w-48 h-48" />
            <a href={showQr.qr} download={`${showQr.name}-qr.png`} className="btn-primary btn-sm">Descarregar</a>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EquipmentForm({ open, onClose, equipment, types, rooms, onSaved }: any) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: equipment || {} });
  useEffect(() => { reset(equipment || {}); }, [equipment, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (equipment?.id) await equipmentApi.update(equipment.id, data);
      else await equipmentApi.create(data);
      toast.success(equipment ? 'Atualizado' : 'Criado');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={equipment ? 'Editar Equipamento' : 'Novo Equipamento'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <FormInput label="Nome" required {...register('name', { required: true })} error={errors.name?.message as string} />
        </div>
        <FormSelect label="Tipo" required {...register('equipmentTypeId', { required: true })} error={errors.equipmentTypeId?.message as string}>
          <option value="">Selecionar...</option>
          {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </FormSelect>
        <FormSelect label="Sala" {...register('roomId')}>
          <option value="">Sem sala</option>
          {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </FormSelect>
        <FormInput label="Marca" {...register('brand')} />
        <FormInput label="Modelo" {...register('model')} />
        <FormInput label="Nº Série" {...register('serialNumber')} />
        <FormInput label="Nº Inventário" {...register('inventoryNumber')} />
        <FormSelect label="Estado" {...register('status')}>
          {['ACTIVE','INACTIVE','MAINTENANCE','RETIRED','LOST','STOLEN'].map(s => <option key={s} value={s}>{s}</option>)}
        </FormSelect>
        <FormInput label="Data Aquisição" {...register('acquisitionDate')} type="date" />
        <FormInput label="Custo Aquisição (€)" {...register('acquisitionCost', { valueAsNumber: true })} type="number" step="0.01" />
        <FormInput label="Garantia até" {...register('warrantyExpiry')} type="date" />
        <div className="col-span-2">
          <FormTextarea label="Notas" {...register('notes')} rows={2} />
        </div>
        <div className="col-span-2 flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isSubmitting ? 'A guardar...' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

interface ImportRow {
  nome: string;
  tipo: string;
  sala?: string;
  marca?: string;
  modelo?: string;
  nSerie?: string;
  nInventario?: string;
  estado?: string;
  notas?: string;
}

interface ImportResult {
  row: number;
  data: ImportRow;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

const COLUMN_MAP: Record<string, keyof ImportRow> = {
  'nome': 'nome', 'name': 'nome', 'equipamento': 'nome',
  'tipo': 'tipo', 'type': 'tipo', 'categoria': 'tipo',
  'sala': 'sala', 'room': 'sala', 'localização': 'sala', 'localizacao': 'sala',
  'marca': 'marca', 'brand': 'marca',
  'modelo': 'modelo', 'model': 'modelo',
  'nº série': 'nSerie', 'n serie': 'nSerie', 'serial': 'nSerie', 'serialnumber': 'nSerie', 'nº serie': 'nSerie', 'serie': 'nSerie',
  'nº inventário': 'nInventario', 'n inventario': 'nInventario', 'inventory': 'nInventario', 'inventário': 'nInventario', 'inventario': 'nInventario',
  'estado': 'estado', 'status': 'estado',
  'notas': 'notas', 'notes': 'notas', 'observações': 'notas', 'observacoes': 'notas',
};

const STATUS_MAP: Record<string, string> = {
  'ativo': 'ACTIVE', 'active': 'ACTIVE', 'activo': 'ACTIVE',
  'inativo': 'INACTIVE', 'inactive': 'INACTIVE', 'inactivo': 'INACTIVE',
  'manutenção': 'MAINTENANCE', 'manutencao': 'MAINTENANCE', 'maintenance': 'MAINTENANCE',
  'abatido': 'RETIRED', 'retired': 'RETIRED',
  'perdido': 'LOST', 'lost': 'LOST',
  'roubado': 'STOLEN', 'stolen': 'STOLEN',
};

function ImportModal({ open, onClose, types, rooms, onImported }: { open: boolean; onClose: () => void; types: EquipmentType[]; rooms: Room[]; onImported: () => void }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');

  const parseFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        if (json.length === 0) {
          toast.error('Ficheiro vazio ou sem dados válidos');
          return;
        }

        const parsed: ImportResult[] = json.map((raw, idx) => {
          const mapped: any = {};
          for (const [key, value] of Object.entries(raw)) {
            const normalizedKey = key.toLowerCase().trim();
            const field = COLUMN_MAP[normalizedKey];
            if (field) mapped[field] = String(value).trim();
          }
          return { row: idx + 2, data: mapped as ImportRow, status: 'pending' as const };
        });

        const valid = parsed.filter(r => r.data.nome && r.data.tipo);
        if (valid.length === 0) {
          toast.error('Nenhuma linha válida encontrada. Certifique-se que as colunas "Nome" e "Tipo" existem.');
          return;
        }

        setRows(valid);
        setStep('preview');
      } catch {
        toast.error('Erro ao ler ficheiro. Verifique o formato.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const findOrCreateRoom = async (roomName: string): Promise<{ id?: string; warning?: string }> => {
    if (!roomName) return {};
    const existing = rooms.find(r => r.name.toLowerCase() === roomName.toLowerCase() || r.code?.toLowerCase() === roomName.toLowerCase());
    if (existing) return { id: existing.id };
    try {
      const created: any = await roomsApi.create({ name: roomName, code: roomName.substring(0, 10).toUpperCase() });
      rooms.push(created);
      return { id: created.id };
    } catch {
      return { warning: `Sala "${roomName}" não encontrada (sem permissão para criar)` };
    }
  };

  const findType = (typeName: string): string | undefined => {
    const t = types.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    return t?.id;
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const typeId = findType(row.data.tipo);
        if (!typeId) {
          rows[i] = { ...row, status: 'error', error: `Tipo "${row.data.tipo}" não encontrado` };
          setRows([...rows]);
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }

        const roomResult = await findOrCreateRoom(row.data.sala || '');
        const statusValue = row.data.estado ? (STATUS_MAP[row.data.estado.toLowerCase()] || 'ACTIVE') : 'ACTIVE';

        await equipmentApi.create({
          name: row.data.nome,
          equipmentTypeId: typeId,
          roomId: roomResult.id || undefined,
          brand: row.data.marca || undefined,
          model: row.data.modelo || undefined,
          serialNumber: row.data.nSerie || undefined,
          inventoryNumber: row.data.nInventario || undefined,
          status: statusValue,
          notes: row.data.notas || undefined,
        });

        rows[i] = { ...row, status: 'success', error: roomResult.warning };
        successCount++;
      } catch (err: any) {
        rows[i] = { ...row, status: 'error', error: err?.message || 'Erro ao criar equipamento' };
      }
      setRows([...rows]);
      setProgress(((i + 1) / rows.length) * 100);
    }

    setStep('done');
    if (successCount > 0) {
      toast.success(`${successCount} equipamento(s) importado(s) com sucesso`);
      onImported();
    }
  };

  const successCount = rows.filter(r => r.status === 'success').length;
  const warningCount = rows.filter(r => r.status === 'success' && r.error).length;
  const errorCount = rows.filter(r => r.status === 'error').length;

  return (
    <Modal open={open} onClose={onClose} title="Importar Equipamentos" size="xl">
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-2">Arraste um ficheiro Excel ou CSV aqui</p>
            <p className="text-xs text-gray-400 mb-4">.xlsx, .xls, .csv</p>
            <label className="btn-primary btn-sm cursor-pointer inline-flex items-center gap-2">
              <Upload className="w-4 h-4" /> Selecionar Ficheiro
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Colunas esperadas:</p>
            <p><strong>Obrigatórias:</strong> Nome, Tipo</p>
            <p><strong>Opcionais:</strong> Sala, Marca, Modelo, Nº Série, Nº Inventário, Estado, Notas</p>
            <p className="mt-2">Salas que não existam serão criadas automaticamente.</p>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600"><strong>{rows.length}</strong> linha(s) encontrada(s) em <strong>{fileName}</strong></p>
            <button onClick={() => { setStep('upload'); setRows([]); }} className="text-sm text-primary-600 hover:underline">Trocar ficheiro</button>
          </div>
          <div className="max-h-64 overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Sala</th>
                  <th className="px-3 py-2 text-left">Marca</th>
                  <th className="px-3 py-2 text-left">Modelo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5 text-gray-400">{r.row}</td>
                    <td className="px-3 py-1.5 font-medium">{r.data.nome}</td>
                    <td className="px-3 py-1.5">{r.data.tipo}</td>
                    <td className="px-3 py-1.5">{r.data.sala || '—'}</td>
                    <td className="px-3 py-1.5">{r.data.marca || '—'}</td>
                    <td className="px-3 py-1.5">{r.data.modelo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={handleImport} className="btn-primary">Importar {rows.length} equipamento(s)</button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600 text-center">A importar equipamentos...</p>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-primary-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 text-center">{Math.round(progress)}%</p>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4 py-4">
          <div className="text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <p className="text-lg font-semibold">Importação Concluída</p>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4" /> {successCount} sucesso</span>
            {warningCount > 0 && <span className="flex items-center gap-1 text-yellow-600"><AlertTriangle className="w-4 h-4" /> {warningCount} aviso(s)</span>}
            {errorCount > 0 && <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="w-4 h-4" /> {errorCount} erro(s)</span>}
          </div>
          {warningCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <p className="font-medium mb-1">Equipamentos criados sem sala atribuída:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {rows.filter(r => r.status === 'success' && r.error).map((r, i) => (
                  <li key={i}><strong>{r.data.nome}</strong> — {r.error}</li>
                ))}
              </ul>
            </div>
          )}
          {errorCount > 0 && (
            <div className="max-h-40 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-red-50 sticky top-0">
                  <tr><th className="px-3 py-2 text-left">Linha</th><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Erro</th></tr>
                </thead>
                <tbody>
                  {rows.filter(r => r.status === 'error').map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5 text-gray-400">{r.row}</td>
                      <td className="px-3 py-1.5">{r.data.nome}</td>
                      <td className="px-3 py-1.5 text-red-600">{r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-primary">Fechar</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
