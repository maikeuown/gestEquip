'use client';
import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/layout/Header';
import api from '@/lib/api/client';
import toast from 'react-hot-toast';
import {
  Database, Play, CheckCircle, XCircle, AlertTriangle, RefreshCw, Eye,
  Shield, Server, Users, Clock, Activity, ChevronDown, ChevronUp,
  UserPlus, UserCheck, UserX, Info,
} from 'lucide-react';
import clsx from 'clsx';

// ── Schema ──

const adSchema = z.object({
  domainController: z.string().min(1, 'Obrigatório'),
  port: z.coerce.number().min(1).default(636),
  baseDn: z.string().min(1, 'Obrigatório'),
  bindDn: z.string().min(1, 'Obrigatório'),
  bindPassword: z.string().min(1, 'Obrigatório'),
  useLdaps: z.boolean().default(true),
  teacherGroupDns: z.string().min(1, 'Adicione pelo menos um grupo').array().min(1, 'Adicione pelo menos um grupo'),
  userFilter: z.string().optional(),
  enabled: z.boolean().default(false),
});

type AdForm = z.infer<typeof adSchema>;

// ── Types ──

interface PreviewUser {
  sAMAccountName: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  department?: string;
  title?: string;
  phone?: string;
  office?: string;
  existsInDb: boolean;
  existingUserId?: string;
  conflict?: string;
}

interface SyncResult {
  success: boolean;
  operation: string;
  status: string;
  usersFound: number;
  usersCreated: number;
  usersUpdated: number;
  usersSkipped: number;
  usersFailed: number;
  errors: string[];
  message: string;
}

interface SyncStatus {
  configured: boolean;
  enabled?: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncUsersCount?: number;
  lastSyncErrors?: string[];
  recentSyncs?: Array<{
    id: string;
    operation: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    usersFound: number;
    usersCreated: number;
    usersUpdated: number;
    usersSkipped: number;
    usersFailed: number;
  }>;
}

// ── Default teacher groups for Portuguese schools ──

const DEFAULT_GROUPS = ['Professores', 'Docentes', 'Teachers'];

// ── API helpers ──

const adApi = {
  getConfig: () => api.get('/ad/config'),
  saveConfig: (data: AdForm) => api.post('/ad/config', data),
  testConnection: (data: AdForm) => api.post('/ad/test-connection', {
    domainController: data.domainController,
    port: data.port,
    baseDn: data.baseDn,
    bindDn: data.bindDn,
    bindPassword: data.bindPassword,
    useLdaps: data.useLdaps,
  }),
  preview: () => api.post('/ad/preview'),
  sync: (type = 'full') => api.post('/ad/sync', { type }),
  syncStatus: () => api.get('/ad/sync-status'),
};

// ── Page ──

export default function AdIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const {
    register, handleSubmit, watch, setValue, formState: { errors, isSubmitting },
    reset,
  } = useForm<AdForm>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      port: 636,
      useLdaps: true,
      teacherGroupDns: ['Professores'],
      enabled: false,
    },
  });

  const teacherGroupDns = watch('teacherGroupDns');
  const [groupInput, setGroupInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Load existing config
  const loadConfig = useCallback(async () => {
    try {
      const config = await adApi.getConfig();
      if (config) {
        reset({
          domainController: config.domainController,
          port: config.port,
          baseDn: config.baseDn,
          bindDn: config.bindDn,
          bindPassword: '', // never returned
          useLdaps: config.useLdaps,
          teacherGroupDns: config.teacherGroupDns || [],
          userFilter: config.userFilter || '',
          enabled: config.enabled,
        });
        setSyncStatus({
          configured: true,
          enabled: config.enabled,
          lastSyncAt: config.lastSyncAt,
          lastSyncStatus: config.lastSyncStatus,
          lastSyncUsersCount: config.lastSyncUsersCount,
          lastSyncErrors: config.lastSyncErrors,
          recentSyncs: config.syncLogs || [],
        });
      }
    } catch {
      // No config yet
    } finally {
      setLoading(false);
    }
  }, [reset]);

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await adApi.syncStatus();
      setSyncStatus(status);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadConfig();
    loadSyncStatus();
  }, [loadConfig, loadSyncStatus]);

  // Add teacher group
  const addGroup = () => {
    const trimmed = groupInput.trim();
    if (!trimmed) return;
    if (teacherGroupDns.includes(trimmed)) {
      toast.error('Grupo já adicionado');
      return;
    }
    setValue('teacherGroupDns', [...teacherGroupDns, trimmed]);
    setGroupInput('');
  };

  const removeGroup = (idx: number) => {
    const next = [...teacherGroupDns];
    next.splice(idx, 1);
    setValue('teacherGroupDns', next);
  };

  // Test connection
  const onTest = async (data: AdForm) => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adApi.testConnection(data);
      setTestResult({ success: result.success, message: result.message });
      if (result.success) {
        toast.success('Ligação AD bem-sucedida!');
      } else {
        toast.error(result.message);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Erro ao testar' });
      toast.error(e.message || 'Erro ao testar ligação');
    } finally {
      setTesting(false);
    }
  };

  // Save config
  const onSave = async (data: AdForm) => {
    try {
      await adApi.saveConfig(data);
      toast.success('Configuração guardada com sucesso');
      loadConfig();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao guardar');
    }
  };

  // Preview
  const onPreview = async () => {
    setPreviewLoading(true);
    setShowPreview(false);
    try {
      const result = await adApi.preview();
      setPreviewUsers(result.preview || []);
      setShowPreview(true);
      toast.success(`${result.usersFound} professor(es) encontrados no AD`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao obter preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Sync
  const onSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await adApi.sync('full');
      setSyncResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      loadSyncStatus();
    } catch (e: any) {
      toast.error(e.message || 'Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Integração Active Directory" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integração Active Directory</h1>
            <p className="text-gray-500 mt-1">
              Importar professores do servidor Active Directory da escola. Apenas contas de professores são importadas.
            </p>
          </div>
        </div>

        {/* Connection Form */}
        <form onSubmit={handleSubmit(onSave)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-400" />
            Configuração da Ligação
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Domain Controller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Controlador de Domínio</label>
              <input
                {...register('domainController')}
                placeholder="dc.escola.local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              {errors.domainController && <p className="text-red-500 text-xs mt-1">{errors.domainController.message}</p>}
            </div>

            {/* Port */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
              <input
                {...register('port')}
                type="number"
                placeholder="636"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              {errors.port && <p className="text-red-500 text-xs mt-1">{errors.port.message}</p>}
              <p className="text-gray-400 text-xs mt-1">LDAPS: 636 (recomendado)</p>
            </div>

            {/* Base DN */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Base DN</label>
              <input
                {...register('baseDn')}
                placeholder="DC=escola,DC=local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              {errors.baseDn && <p className="text-red-500 text-xs mt-1">{errors.baseDn.message}</p>}
            </div>

            {/* Bind DN */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Conta de Serviço (Bind DN)</label>
              <input
                {...register('bindDn')}
                placeholder="CN=svc-gestequip,OU=Service Accounts,DC=escola,DC=local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              {errors.bindDn && <p className="text-red-500 text-xs mt-1">{errors.bindDn.message}</p>}
            </div>

            {/* Bind Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Palavra-passe do Serviço</label>
              <input
                {...register('bindPassword')}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              {errors.bindPassword && <p className="text-red-500 text-xs mt-1">{errors.bindPassword.message}</p>}
            </div>

            {/* LDAPS Toggle */}
            <div className="flex items-center gap-3 pt-6">
              <input
                {...register('useLdaps')}
                type="checkbox"
                id="useLdaps"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="useLdaps" className="text-sm text-gray-700 flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-500" />
                Usar LDAPS (recomendado — porta 636)
              </label>
            </div>
          </div>

          {/* Teacher Groups */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupos de Professores no AD</label>
            <p className="text-xs text-gray-400 mb-2">
              Grupos típicos: &quot;Professores&quot;, &quot;Docentes&quot;, &quot;Teachers&quot;
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {teacherGroupDns.map((g, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {g}
                  <button type="button" onClick={() => removeGroup(i)} className="text-blue-400 hover:text-blue-600">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {teacherGroupDns.length === 0 && (
                <span className="text-sm text-gray-400">Nenhum grupo adicionado</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGroup(); } }}
                placeholder="CN=Professores,OU=Groups,DC=escola,DC=local"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={addGroup} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition">
                Adicionar
              </button>
            </div>
            {errors.teacherGroupDns && <p className="text-red-500 text-xs mt-1">{errors.teacherGroupDns.message}</p>}
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtro Adicional (opcional)</label>
            <input
              {...register('userFilter')}
              placeholder="(&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-mono"
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center gap-3">
            <input
              {...register('enabled')}
              type="checkbox"
              id="adEnabled"
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="adEnabled" className="text-sm font-medium text-gray-700">
              Ativar integração Active Directory
            </label>
          </div>

          {/* Test & Save buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit(onTest) as any}
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {testing ? (
                <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              Testar Ligação
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Guardar Configuração
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={clsx(
              'p-3 rounded-lg text-sm flex items-center gap-2',
              testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
            )}>
              {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
              {testResult.message}
            </div>
          )}
        </form>

        {/* Sync Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Sincronização de Professores
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onPreview}
              disabled={previewLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {previewLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Pré-visualizar
            </button>
            <button
              onClick={onSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
            >
              {syncing ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sincronizar Agora
            </button>
          </div>

          {/* Sync Result */}
          {syncResult && (
            <div className={clsx(
              'p-4 rounded-lg space-y-2',
              syncResult.success ? 'bg-green-50' : 'bg-red-50',
            )}>
              <div className="flex items-center gap-2 font-medium text-sm">
                {syncResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                {syncResult.message}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-gray-900">{syncResult.usersFound}</div>
                  <div className="text-gray-500 text-xs">Encontrados</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-green-600">{syncResult.usersCreated}</div>
                  <div className="text-gray-500 text-xs">Criados</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-blue-600">{syncResult.usersUpdated}</div>
                  <div className="text-gray-500 text-xs">Atualizados</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{syncResult.usersSkipped}</div>
                  <div className="text-gray-500 text-xs">Ignorados</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-2xl font-bold text-red-600">{syncResult.usersFailed}</div>
                  <div className="text-gray-500 text-xs">Falhas</div>
                </div>
              </div>
              {syncResult.errors.length > 0 && (
                <div className="bg-white rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-700 mb-1">Erros:</p>
                  {syncResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {showPreview && previewUsers.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Pré-visualização — {previewUsers.length} professor(es) encontrado(s)
                </span>
                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Departamento</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Conflito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewUsers.map((u, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {u.existsInDb ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 text-xs">
                              <UserCheck className="w-3.5 h-3.5" /> Existente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                              <UserPlus className="w-3.5 h-3.5" /> Novo
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">{u.displayName}</td>
                        <td className="px-3 py-2 text-gray-500">{u.email}</td>
                        <td className="px-3 py-2 text-gray-500">{u.department || '—'}</td>
                        <td className="px-3 py-2">
                          {u.conflict ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                              <AlertTriangle className="w-3.5 h-3.5" /> {u.conflict}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sync History */}
        {syncStatus && syncStatus.configured && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                Histórico de Sincronização
              </h2>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                {showHistory ? 'Ocultar' : 'Mostrar'}
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Last sync summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Última sincronização</div>
                <div className="text-sm font-medium text-gray-900">
                  {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString('pt-PT') : 'Nunca'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Estado</div>
                <div className={clsx(
                  'text-sm font-medium',
                  syncStatus.lastSyncStatus === 'success' ? 'text-green-600' :
                  syncStatus.lastSyncStatus === 'partial' ? 'text-yellow-600' :
                  syncStatus.lastSyncStatus === 'failed' ? 'text-red-600' : 'text-gray-500',
                )}>
                  {syncStatus.lastSyncStatus ? (
                    syncStatus.lastSyncStatus === 'success' ? 'Sucesso' :
                    syncStatus.lastSyncStatus === 'partial' ? 'Parcial' : 'Falhou'
                  ) : '—'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Utilizadores</div>
                <div className="text-sm font-medium text-gray-900">{syncStatus.lastSyncUsersCount || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Estado AD</div>
                <div className={clsx(
                  'text-sm font-medium',
                  syncStatus.enabled ? 'text-green-600' : 'text-gray-400',
                )}>
                  {syncStatus.enabled ? 'Ativo' : 'Inativo'}
                </div>
              </div>
            </div>

            {/* Sync history table */}
            {showHistory && syncStatus.recentSyncs && syncStatus.recentSyncs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Criados</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Atualizados</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Falhas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {syncStatus.recentSyncs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">
                          {new Date(log.startedAt).toLocaleString('pt-PT')}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{log.operation}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={clsx(
                            'text-xs font-medium',
                            log.status === 'success' ? 'text-green-600' :
                            log.status === 'partial' ? 'text-yellow-600' : 'text-red-600',
                          )}>
                            {log.status === 'success' ? 'Sucesso' : log.status === 'partial' ? 'Parcial' : 'Falhou'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-green-600 font-medium">{log.usersCreated}</td>
                        <td className="px-3 py-2 text-blue-600 font-medium">{log.usersUpdated}</td>
                        <td className="px-3 py-2 text-red-600 font-medium">{log.usersFailed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 space-y-1">
            <p className="font-medium">Informações importantes</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600">
              <li>Apenas professores dos grupos AD especificados são importados</li>
              <li>Contas desativadas no AD são automaticamente excluídas</li>
              <li>Os professores importados têm a função <strong>Professor</strong></li>
              <li>Os dados são atualizados a cada sincronização manual</li>
              <li>A ligação usa LDAPS (porta 636) para segurança</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
