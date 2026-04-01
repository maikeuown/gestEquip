'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  MoreHorizontal, 
  QrCode,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { equipmentApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';

interface Equipment {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  inventoryNumber?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DISPOSED';
  room?: { id: string; name: string };
  equipmentType?: { id: string; name: string };
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Estilos reutilizáveis
const btnBase = "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";
const btnOutline = "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500";
const btnDestructive = "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500";
const btnGhost = "text-gray-700 hover:bg-gray-100";

export default function EquipmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLTableCellElement>(null);
  
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Equipment | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: Number(searchParams.get('page')) || 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
      };
      
      const res = await equipmentApi.list(params);
      setEquipment(res.data || []);
      setPagination(prev => ({
        ...prev,
        total: res.meta?.total || 0,
        totalPages: res.meta?.totalPages || 0,
      }));
    } catch (err) {
      console.error('Failed to load equipment:', err);
      setToast({ message: 'Não foi possível carregar os equipamentos', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (statusFilter) params.set('status', statusFilter);
    if (pagination.page > 1) params.set('page', String(pagination.page));
    
    router.replace(`/equipment?${params.toString()}`, { scroll: false });
  }, [searchTerm, statusFilter, pagination.page, router]);

  const handleExport = async () => {
    try {
      const blob = await equipmentApi.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equipamentos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setToast({ message: 'Ficheiro CSV exportado com sucesso', type: 'success' });
    } catch (err) {
      console.error('Export failed:', err);
      setToast({ message: 'Falha ao exportar CSV', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await equipmentApi.delete(id);
      setToast({ message: 'Equipamento eliminado com sucesso', type: 'success' });
      loadEquipment();
    } catch (err) {
      console.error('Delete failed:', err);
      setToast({ message: 'Não foi possível eliminar o equipamento', type: 'error' });
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => equipmentApi.delete(id)));
      setToast({ message: `${ids.length} equipamentos eliminados com sucesso`, type: 'success' });
      setSelectedIds(new Set());
      loadEquipment();
    } catch (err) {
      console.error('Bulk delete failed:', err);
      setToast({ message: 'Falha ao eliminar equipamentos', type: 'error' });
    } finally {
      setBulkDeleteModalOpen(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedIds.size === equipment.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(equipment.map(e => e.id)));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasFilters = searchTerm || statusFilter;

  return (
    <div>
      <Header title="Equipamentos" />
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar equipamentos..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-10 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos os estados</option>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="MAINTENANCE">Manutenção</option>
                <option value="DISPOSED">Eliminado</option>
              </select>
              
              {hasFilters && (
                <button 
                  onClick={clearFilters}
                  className={`${btnBase} ${btnGhost}`}
                >
                  <Filter className="w-4 h-4" />
                  Limpar
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-gray-600 mr-2">
                  {selectedIds.size} selecionados
                </span>
                <button 
                  onClick={() => setBulkDeleteModalOpen(true)}
                  className={`${btnBase} ${btnDestructive}`}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </>
            )}
            
            {/* Export Button */}
            <button 
              onClick={handleExport} 
              className={`${btnBase} ${btnOutline}`}
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            
            {/* Import Button - NOVO */}
            <Link href="/import">
              <button className={`${btnBase} ${btnOutline}`}>
                <Upload className="w-4 h-4" />
                Importar
              </button>
            </Link>
            
            {/* Add Button */}
            <Link href="/equipment/new">
              <button className={`${btnBase} ${btnPrimary}`}>
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </Link>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando {equipment.length} de {pagination.total} equipamentos
          </span>
          {selectedIds.size > 0 && (
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="text-blue-600 hover:text-blue-700"
            >
              Limpar seleção
            </button>
          )}
        </div>

        {/* Equipment Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox"
                    checked={selectedIds.size === equipment.length && equipment.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Sala</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Nº Inventário</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  </td>
                </tr>
              ) : equipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhum equipamento encontrado
                  </td>
                </tr>
              ) : (
                equipment.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.brand} {item.model}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.equipmentType?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.room?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={item.status} type="equipment" />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.inventoryNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-right relative" ref={openMenuId === item.id ? menuRef : null}>
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        className={`${btnBase} ${btnGhost} p-2`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      
                      {/* Dropdown Menu Simples */}
                      {openMenuId === item.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-50 py-1">
                          <Link 
                            href={`/equipment/${item.id}`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setOpenMenuId(null)}
                          >
                            Ver detalhes
                          </Link>
                          <Link 
                            href={`/equipment/${item.id}/qr`}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            Ver QR Code
                          </Link>
                          <Link 
                            href={`/equipment/${item.id}/edit`}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Link>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setDeleteModalOpen(true);
                              setOpenMenuId(null);
                            }}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className={`${btnBase} ${btnOutline} px-3`}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className={`${btnBase} ${btnOutline} px-3`}
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar eliminação
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Tem certeza que deseja eliminar o equipamento "{itemToDelete?.name}"? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  className={`${btnBase} ${btnOutline}`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => itemToDelete && handleDelete(itemToDelete.id)}
                  className={`${btnBase} ${btnDestructive}`}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar eliminação em massa
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Tem certeza que deseja eliminar {selectedIds.size} equipamentos? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setBulkDeleteModalOpen(false)}
                  className={`${btnBase} ${btnOutline}`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className={`${btnBase} ${btnDestructive}`}
                >
                  Eliminar {selectedIds.size} equipamentos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}