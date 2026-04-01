export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TECHNICIAN' | 'TEACHER' | 'STAFF';
export type EquipmentStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED' | 'LOST' | 'STOLEN';
export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MovementType = 'CHECK_IN' | 'CHECK_OUT' | 'TRANSFER' | 'LOAN' | 'RETURN';
export type MovementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type NotificationType = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'MAINTENANCE' | 'MOVEMENT' | 'TICKET' | 'SYSTEM';

export interface Institution {
  id: string; name: string; shortName: string; taxId?: string; email?: string; phone?: string;
  address?: string; city?: string; postalCode?: string; country: string; logoUrl?: string;
  website?: string; isActive: boolean; createdAt: string;
}

export interface User {
  id: string; email: string; firstName: string; lastName: string; phone?: string;
  role: UserRole; isActive: boolean; avatarUrl?: string; lastLoginAt?: string;
  institutionId: string; institution?: Institution; createdAt: string;
}

export interface EquipmentType {
  id: string; name: string; description?: string; icon?: string; institutionId: string; _count?: { equipment: number };
}

export interface Room {
  id: string; name: string; code?: string; building?: string; floor?: string; description?: string;
  capacity?: number; institutionId: string; _count?: { equipment: number };
}

export interface Equipment {
  id: string; name: string; brand?: string; model?: string; serialNumber?: string;
  inventoryNumber?: string; qrCode?: string; barcode?: string; status: EquipmentStatus;
  acquisitionDate?: string; acquisitionCost?: number; warrantyExpiry?: string;
  specifications?: Record<string, any>; notes?: string; isActive: boolean;
  institutionId: string; equipmentTypeId: string; roomId?: string; assignedToId?: string;
  createdById: string; createdAt: string; updatedAt: string;
  equipmentType?: EquipmentType; room?: Room; assignedTo?: User; institution?: Institution;
  _count?: { maintenanceTickets: number; movements: number };
}

export interface MaintenanceTicket {
  id: string; ticketNumber: string; title: string; description: string;
  priority: MaintenancePriority; status: MaintenanceStatus; isPreventive: boolean;
  scheduledDate?: string; resolvedAt?: string; estimatedCost?: number; actualCost?: number;
  resolution?: string; notes?: string; institutionId: string; equipmentId: string;
  reportedById: string; assignedToId?: string; createdAt: string; updatedAt: string;
  equipment?: Equipment; reportedBy?: User; assignedTo?: User;
  _count?: { logs: number; messages: number };
}

export interface Movement {
  id: string; type: MovementType; status: MovementStatus; reason?: string; notes?: string;
  scheduledDate?: string; completedAt?: string; institutionId: string; equipmentId: string;
  requestedById: string; approvedById?: string; fromRoomId?: string; toRoomId?: string;
  createdAt: string;
  equipment?: Equipment; requestedBy?: User; approvedBy?: User; fromRoom?: Room; toRoom?: Room;
}

export interface Request {
  id: string; title: string; description: string; status: RequestStatus; notes?: string;
  approvalNotes?: string; dueDate?: string; completedAt?: string;
  institutionId: string; createdById: string; approvedById?: string; createdAt: string;
  createdBy?: User; approvedBy?: User;
}

export interface Notification {
  id: string; type: NotificationType; title: string; message: string; isRead: boolean;
  readAt?: string; data?: any; link?: string; createdAt: string;
}

export interface Message {
  id: string; content: string; senderId: string; ticketId?: string; requestId?: string;
  createdAt: string; sender?: User;
}

export interface DashboardStats {
  equipment: { total: number; active: number; maintenance: number };
  tickets: { open: number; inProgress: number; resolvedThisMonth: number };
  movements: { pending: number };
  users: { total: number; active: number };
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type AssistanceProblem = 'NOT_TURNING_ON' | 'NOT_WORKING' | 'CONNECTIVITY_ISSUE' | 'AUDIO_PROBLEM' | 'DISPLAY_PROBLEM' | 'OTHER';

export interface Schedule {
  id: string;
  roomId: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subject?: string;
  teacher?: string;
  institutionId: string;
  createdAt: string;
  room?: Room;
}

export interface FavoriteRoom {
  id: string;
  roomId: string;
  userId: string;
  createdAt: string;
  room?: Room;
}

export interface AssistanceRequest {
  id: string;
  title: string;
  description: string;
  problemType: AssistanceProblem;
  status: RequestStatus;
  roomId: string;
  equipmentId?: string;
  createdById: string;
  assignedToId?: string;
  resolvedAt?: string;
  resolution?: string;
  institutionId: string;
  createdAt: string;
  updatedAt: string;
  room?: Room;
  equipment?: Equipment;
  createdBy?: User;
  assignedTo?: User;
}
