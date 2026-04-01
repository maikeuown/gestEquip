import clsx from 'clsx';

const equipmentStatus: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-gray-100 text-gray-600',
  MAINTENANCE: 'bg-orange-100 text-orange-700', RETIRED: 'bg-red-100 text-red-700',
  LOST: 'bg-red-100 text-red-700', STOLEN: 'bg-red-100 text-red-700',
};
const maintenanceStatus: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  WAITING_PARTS: 'bg-orange-100 text-orange-700', RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-red-100 text-red-700',
};
const priority: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600', MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700',
};
const movementStatus: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};
const requestStatus: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-gray-100 text-gray-600',
};

const labels: Record<string, string> = {
  ACTIVE: 'Ativo', INACTIVE: 'Inativo', MAINTENANCE: 'Manutenção', RETIRED: 'Retirado', LOST: 'Perdido', STOLEN: 'Roubado',
  OPEN: 'Aberto', IN_PROGRESS: 'Em curso', WAITING_PARTS: 'Aguarda peças', RESOLVED: 'Resolvido', CLOSED: 'Fechado', CANCELLED: 'Cancelado',
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
  PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado', COMPLETED: 'Completo',
  CHECK_IN: 'Entrada', CHECK_OUT: 'Saída', TRANSFER: 'Transferência', LOAN: 'Empréstimo', RETURN: 'Devolução',
};

type BadgeType = 'equipment' | 'maintenance' | 'priority' | 'movement' | 'request';

const maps: Record<BadgeType, Record<string, string>> = {
  equipment: equipmentStatus,
  maintenance: maintenanceStatus,
  priority,
  movement: movementStatus,
  request: requestStatus,
};

export function Badge({ value, type }: { value: string; type: BadgeType }) {
  const cls = maps[type]?.[value] || 'bg-gray-100 text-gray-600';
  return <span className={clsx('badge', cls)}>{labels[value] || value}</span>;
}
