'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { roomsApi, equipmentApi, maintenanceApi, assistanceRequestsApi } from '@/lib/api';
import Tooltip from '@/components/ui/Tooltip';
import {
  Wrench, AlertTriangle, Monitor, CheckCircle, XCircle, ExternalLink,
  ChevronDown, ChevronRight, GripVertical, MoreVertical, Pencil, Trash2, ArrowUpDown, Building2,
} from 'lucide-react';

// ── Types ──

interface Room {
  id: string;
  name: string;
  code: string | null;
  floor: string | null;
  building: string | null;
  capacity: number | null;
  institutionId: string;
  [key: string]: unknown;
}

interface Equipment {
  id: string;
  name: string;
  roomId: string | null;
  status: string;
  institutionId: string;
  [key: string]: unknown;
}

interface MaintenanceTicket {
  id: string;
  equipmentId: string;
  title: string;
  status: string;
  priority: string;
  institutionId: string;
  [key: string]: unknown;
}

interface AssistanceRequest {
  id: string;
  roomId: string;
  equipmentId: string | null;
  title: string;
  status: string;
  institutionId: string;
  [key: string]: unknown;
}

interface RoomWithStatus {
  room: Room;
  equipmentCount: number;
  roomEquipment: Equipment[];
  openTickets: number;
  hasCritical: boolean;
  hasUrgent: boolean;
  openRequestCount: number;
  statusDot: string;
  statusLabel: string;
  statusCategory: 'ok' | 'alert' | 'maintenance' | 'critical' | 'empty';
}

interface FloorNode {
  floor: string;
  order: number;
  rooms: RoomWithStatus[];
  expanded: boolean;
  // Summary counts
  okCount: number;
  alertCount: number;
  maintenanceCount: number;
  criticalCount: number;
  emptyCount: number;
}

// ── Constants ──

const OPEN_MAINTENANCE_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'];
const OPEN_REQUEST_STATUSES = ['PENDING', 'IN_PROGRESS'];
const CRITICAL_PRIORITIES = ['CRITICAL', 'HIGH'];

const FLOOR_ORDER: Record<string, number> = {
  '3': 0, '2': 1, '1': 2, '0': 3, '-1': 4, '-2': 5,
};

function floorDisplayName(floor: string): string {
  if (floor === 'Sem piso') return 'Sem Piso';
  const n = parseInt(floor, 10);
  if (isNaN(n)) return floor;
  if (n > 0) return `${n}º Andar`;
  if (n === 0) return 'Térreo';
  return `Subsolo ${Math.abs(n)}`;
}

// ── Status helpers ──

function getStatusCategory(room: RoomWithStatus): RoomWithStatus['statusCategory'] {
  if (room.equipmentCount === 0) return 'empty';
  if (room.hasCritical) return 'critical';
  if (room.hasUrgent || room.openTickets > 0) return 'maintenance';
  if (room.openRequestCount > 0) return 'alert';
  return 'ok';
}

function getRoomDotColor(cat: RoomWithStatus['statusCategory']): string {
  switch (cat) {
    case 'empty': return 'bg-gray-400';
    case 'critical': return 'bg-red-500 animate-pulse';
    case 'maintenance': return 'bg-orange-500 animate-pulse';
    case 'alert': return 'bg-yellow-500';
    default: return 'bg-green-500';
  }
}

function getRoomCardBorder(cat: RoomWithStatus['statusCategory']): string {
  switch (cat) {
    case 'empty': return 'border-gray-300 bg-gray-50';
    case 'critical': return 'border-red-400 bg-red-50/50';
    case 'maintenance': return 'border-orange-400 bg-orange-50/50';
    case 'alert': return 'border-yellow-400 bg-yellow-50/50';
    default: return 'border-green-300 bg-green-50/50';
  }
}

// ── Context Menu Types ──

interface ContextMenuState {
  roomId: string;
  roomName: string;
  x: number;
  y: number;
}

// ── Page ──

export default function DiagramaEdificio() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTicket[]>([]);
  const [assistanceRequests, setAssistanceRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Tooltip
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [tooltipLocked, setTooltipLocked] = useState(false);
  const roomRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hoveredRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expand/collapse
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

  // Drag-and-drop: room reordering
  const [draggedRoom, setDraggedRoom] = useState<string | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);

  // Floor header long-press for reorder
  const [dragFloor, setDragFloor] = useState<string | null>(null);
  const floorLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [roomsRes, equipRes, maintRes, assistRes] = await Promise.all([
        roomsApi.list(),
        equipmentApi.list(),
        maintenanceApi.list(),
        assistanceRequestsApi.list(),
      ]);
      const roomsData = roomsRes.data ?? roomsRes;
      const equipData = equipRes.data ?? equipRes;
      const maintData = maintRes.data ?? maintRes;
      const assistData = assistRes.data ?? assistRes;

      setRooms((Array.isArray(roomsData) ? roomsData : []).filter(
        (r: Room) => r.institutionId === user.institutionId && (r as any).deletedAt == null
      ));
      setEquipment((Array.isArray(equipData) ? equipData : []).filter(
        (e: Equipment) => e.institutionId === user.institutionId && (e as any).deletedAt == null
      ));
      setMaintenance((Array.isArray(maintData) ? maintData : []).filter(
        (m: MaintenanceTicket) => m.institutionId === user.institutionId && (m as any).deletedAt == null
      ));
      setAssistanceRequests((Array.isArray(assistData) ? assistData : []).filter(
        (a: AssistanceRequest) => a.institutionId === user.institutionId
      ));
    } catch (err) {
      console.error('Erro ao carregar dados do diagrama:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Build floor nodes ──
  const floorNodes = useMemo((): FloorNode[] => {
    const roomsWithStatus: RoomWithStatus[] = rooms.map((room) => {
      const roomEquip = equipment.filter((e) => e.roomId === room.id);
      const equipIds = new Set(roomEquip.map((e) => e.id));
      const openTickets = maintenance.filter(
        (m) => equipIds.has(m.equipmentId) && OPEN_MAINTENANCE_STATUSES.includes(m.status)
      );
      const openRequests = assistanceRequests.filter(
        (a) => a.roomId === room.id && OPEN_REQUEST_STATUSES.includes(a.status)
      );
      const hasCritical = openTickets.some((t) => CRITICAL_PRIORITIES.includes(t.priority));

      const cat = getStatusCategory({
        room, equipmentCount: roomEquip.length, roomEquipment: roomEquip,
        openTickets: openTickets.length, hasCritical,
        hasUrgent: openTickets.some((t) => t.priority === 'HIGH'),
        openRequestCount: openRequests.length,
      } as RoomWithStatus);

      let statusLabel = 'Sem ocorrências';
      if (roomEquip.length === 0) statusLabel = 'Sem equipamentos';
      else if (hasCritical) statusLabel = `${openTickets.length} crítica(s)`;
      else if (openTickets.some((t) => t.priority === 'HIGH')) statusLabel = `${openTickets.length} urgente(s)`;
      else if (openTickets.length > 0 || openRequests.length > 0) statusLabel = `${openTickets.length + openRequests.length} aberta(s)`;

      return {
        room, equipmentCount: roomEquip.length, roomEquipment: roomEquip,
        openTickets: openTickets.length, hasCritical,
        hasUrgent: openTickets.some((t) => t.priority === 'HIGH'),
        openRequestCount: openRequests.length,
        statusDot: getRoomDotColor(cat),
        statusLabel,
        statusCategory: cat,
      };
    });

    const floorMap = new Map<string, RoomWithStatus[]>();
    for (const rws of roomsWithStatus) {
      const floor = rws.room.floor ?? 'Sem piso';
      if (!floorMap.has(floor)) floorMap.set(floor, []);
      floorMap.get(floor)!.push(rws);
    }

    const sortedFloors = [...floorMap.keys()].sort((a, b) => {
      return (FLOOR_ORDER[a] ?? 99) - (FLOOR_ORDER[b] ?? 99);
    });

    return sortedFloors.map((floor, idx) => {
      const flRooms = floorMap.get(floor)!;
      let okCount = 0, alertCount = 0, maintenanceCount = 0, criticalCount = 0, emptyCount = 0;
      for (const r of flRooms) {
        switch (r.statusCategory) {
          case 'ok': okCount++; break;
          case 'alert': alertCount++; break;
          case 'maintenance': maintenanceCount++; break;
          case 'critical': criticalCount++; break;
          case 'empty': emptyCount++; break;
        }
      }
      return {
        floor,
        order: idx,
        rooms: flRooms,
        expanded: expandedFloors.has(floor),
        okCount, alertCount, maintenanceCount, criticalCount, emptyCount,
      };
    });
  }, [rooms, equipment, maintenance, assistanceRequests, expandedFloors]);

  // ── Toggle floor expand/collapse ──
  const toggleFloor = useCallback((floor: string) => {
    setExpandedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(floor)) next.delete(floor);
      else next.add(floor);
      return next;
    });
  }, []);

  // ── Drag-and-drop room reorder (within same floor) ──
  const handleDragStartRoom = useCallback((roomId: string, e: React.DragEvent) => {
    setDraggedRoom(roomId);
    e.dataTransfer.effectAllowed = 'move';
    // Small transparent drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  }, []);

  const handleDragOverRoom = useCallback((roomId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoom(roomId);
  }, []);

  const handleDropRoom = useCallback((targetRoomId: string) => {
    if (!draggedRoom || draggedRoom === targetRoomId) {
      setDraggedRoom(null);
      setDragOverRoom(null);
      return;
    }

    // Find which floor both rooms belong to
    const draggedRws = floorNodes
      .flatMap((f) => f.rooms)
      .find((r) => r.room.id === draggedRoom);
    const targetRws = floorNodes
      .flatMap((f) => f.rooms)
      .find((r) => r.room.id === targetRoomId);

    if (!draggedRws || !targetRws || draggedRws.room.floor !== targetRws.room.floor) {
      setDraggedRoom(null);
      setDragOverRoom(null);
      return;
    }

    // Reorder within the floor's room list (local state only, not persisted to DB)
    const floor = floorNodes.find((f) => f.floor === draggedRws.room.floor);
    if (!floor) return;

    const reordered = [...floor.rooms];
    const dragIdx = reordered.findIndex((r) => r.room.id === draggedRoom);
    const targetIdx = reordered.findIndex((r) => r.room.id === targetRoomId);
    if (dragIdx < 0 || targetIdx < 0) return;

    const [item] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, item);

    // Update rooms state to reflect new order
    setRooms((prev) => {
      // We track order via the floorNodes arrangement — rooms are re-mapped
      // For now just trigger a re-render; actual persistence would need an API call
      return [...prev];
    });

    setDraggedRoom(null);
    setDragOverRoom(null);
  }, [draggedRoom, floorNodes]);

  const handleDragEndRoom = useCallback(() => {
    setDraggedRoom(null);
    setDragOverRoom(null);
  }, []);

  // ── Floor header long-press drag ──
  const handleFloorPointerDown = useCallback((floor: string) => {
    floorLongPressRef.current = setTimeout(() => {
      setDragFloor(floor);
    }, 400);
  }, []);

  const handleFloorPointerUp = useCallback(() => {
    if (floorLongPressRef.current) {
      clearTimeout(floorLongPressRef.current);
      floorLongPressRef.current = null;
    }
    setDragFloor(null);
  }, []);

  const handleFloorDragOver = useCallback((floor: string, e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFloorDrop = useCallback((targetFloor: string) => {
    if (!dragFloor || dragFloor === targetFloor) return;
    // In a full implementation, persist the new floor order to the backend.
    // For now we just log it.
    setDragFloor(null);
  }, [dragFloor]);

  // ── Room click ──
  const handleRoomClick = useCallback((roomId: string) => {
    router.push(`/rooms?search=${roomId}`);
  }, [router]);

  // ── Tooltip items navigation ──
  const handleEquipmentClick = useCallback((eqId: string) => {
    router.push(`/equipment?search=${eqId}`);
  }, [router]);

  const handleMaintenanceClick = useCallback((ticketId: string) => {
    router.push(`/maintenance?search=${ticketId}`);
  }, [router]);

  const handleRequestClick = useCallback((reqId: string) => {
    router.push(`/assistance-requests?search=${reqId}`);
  }, [router]);

  // ── Context menu ──
  const handleContextMenu = useCallback((e: React.MouseEvent, room: Room) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      roomId: room.id,
      roomName: room.name,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    const handler = () => closeContextMenu();
    window.addEventListener('click', handler);
    window.addEventListener('contextmenu', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('contextmenu', handler);
    };
  }, [closeContextMenu]);

  // ── Tooltip hover logic with debounce ──
  const hideTooltip = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      hoveredRef.current = null;
      setHoveredRoom((prev) => (tooltipLocked ? prev : null));
    }, 150);
  }, [tooltipLocked]);

  const handleMouseEnter = useCallback((roomId: string, el: HTMLDivElement) => {
    hoveredRef.current = el;
    setHoveredRoom(roomId);
    setTooltipLocked(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    hideTooltip();
  }, [hideTooltip]);

  const handleTooltipEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleTooltipLeave = useCallback(() => { hideTooltip(); }, [hideTooltip]);

  const handleTooltipClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button')) return;
    setTooltipLocked((prev) => !prev);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTooltipLocked(false);
        setHoveredRoom(null);
        closeContextMenu();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeContextMenu]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse">
            <div className="h-6 w-48 bg-slate-100 rounded" />
            <div className="h-4 w-64 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalRooms = floorNodes.reduce((sum, f) => sum + f.rooms.length, 0);

  return (
    <div className="p-6 overflow-auto max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Diagrama do Edifício</h1>
        <p className="text-slate-500 mt-1">
          {totalRooms} salas em {floorNodes.length} piso(s). Clique num piso para expandir. Clique numa sala para ver detalhes.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-3 bg-white rounded-lg border border-slate-200 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-600">Tudo OK</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-600">Alertas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-slate-600">Manutenção</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-slate-600">Crítico</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-slate-600">Sem equipamentos</span>
        </div>
      </div>

      {/* Empty state */}
      {totalRooms === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">Nenhuma sala registada</p>
          <p className="text-sm mt-1">Adicione salas para visualizar o diagrama do edifício.</p>
        </div>
      )}

      {/* Floor list */}
      <div className="space-y-3">
        {floorNodes.map((fn) => (
          <div
            key={fn.floor}
            draggable={!!dragFloor}
            onDragOver={(e) => handleFloorDragOver(fn.floor, e)}
            onDrop={() => handleFloorDrop(fn.floor)}
            className={`bg-white rounded-xl border transition-all ${
              dragFloor === fn.floor
                ? 'border-primary-400 shadow-lg shadow-primary-100'
                : 'border-slate-200 shadow-sm hover:shadow-md'
            }`}
          >
            {/* Floor header — clickable to expand/collapse */}
            <button
              onClick={() => toggleFloor(fn.floor)}
              onMouseDown={() => handleFloorPointerDown(fn.floor)}
              onMouseUp={handleFloorPointerUp}
              onMouseLeave={handleFloorPointerUp}
              draggable={!!dragFloor}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 rounded-t-xl transition-colors"
            >
              <GripVertical className={`w-4 h-4 text-slate-300 flex-shrink-0 ${dragFloor === fn.floor ? 'text-primary-500' : ''}`} />
              <span className="text-sm font-bold text-slate-800 flex-shrink-0 min-w-[100px]">
                {floorDisplayName(fn.floor)}
              </span>
              <span className="text-xs text-slate-400">{fn.rooms.length} sala(s)</span>

              {/* Summary badges */}
              <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                {fn.okCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {fn.okCount} ok
                  </span>
                )}
                {fn.alertCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    {fn.alertCount} alerta{fn.alertCount > 1 ? 's' : ''}
                  </span>
                )}
                {fn.maintenanceCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    {fn.maintenanceCount} manutenção
                  </span>
                )}
                {fn.criticalCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {fn.criticalCount} crítica{fn.criticalCount > 1 ? 's' : ''}
                  </span>
                )}
                {fn.emptyCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    {fn.emptyCount} vazio{fn.emptyCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Chevron */}
              <div className="text-slate-400 flex-shrink-0 ml-2">
                {fn.expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </button>

            {/* Expanded room list — smooth height via CSS max-height */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fn.expanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {fn.rooms.length === 0 ? (
                <div className="px-4 pb-4 text-sm text-slate-400 italic">
                  Nenhuma sala neste piso.
                </div>
              ) : (
                <div className="px-4 pb-4 grid gap-2">
                  {fn.rooms.map((rws) => {
                    const refKey = rws.room.id;
                    const cat = rws.statusCategory;
                    const isDragged = draggedRoom === refKey;
                    const isDragOver = dragOverRoom === refKey;

                    return (
                      <div
                        key={rws.room.id}
                        ref={(el) => { if (el) roomRefs.current.set(refKey, el); }}
                        draggable
                        onDragStart={(e) => handleDragStartRoom(refKey, e)}
                        onDragOver={(e) => handleDragOverRoom(refKey, e)}
                        onDrop={(e) => { e.preventDefault(); handleDropRoom(refKey); }}
                        onDragEnd={handleDragEndRoom}
                        onContextMenu={(e) => handleContextMenu(e, rws.room)}
                        className={`group relative flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all duration-150 ${getRoomCardBorder(cat)} ${
                          isDragged ? 'opacity-40 border-dashed border-slate-400' : ''
                        } ${isDragOver ? 'ring-2 ring-primary-400 ring-offset-1' : ''} ${
                          !isDragged ? 'hover:shadow-sm hover:border-slate-300' : ''
                        }`}
                        onMouseEnter={(e) => handleMouseEnter(refKey, e.currentTarget)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleRoomClick(refKey)}
                      >
                        {/* Drag handle */}
                        <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity cursor-grab active:cursor-grabbing" />

                        {/* Status dot */}
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${rws.statusDot}`} />

                        {/* Room info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 truncate">{rws.room.name}</span>
                            {rws.room.code && (
                              <span className="text-xs text-slate-400 flex-shrink-0">({rws.room.code})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500">
                              {rws.equipmentCount === 0
                                ? 'Sem equipamentos'
                                : `${rws.equipmentCount} equipamento${rws.equipmentCount > 1 ? 's' : ''}`}
                            </span>
                            {rws.openTickets > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                                <Wrench className="w-3 h-3" />
                                {rws.openTickets}
                              </span>
                            )}
                            {rws.openRequestCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                {rws.openRequestCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hover indicators */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[9998] bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500 truncate block">{contextMenu.roomName}</span>
          </div>
          <button
            onClick={() => { handleRoomClick(contextMenu.roomId); closeContextMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir detalhes
          </button>
          <button
            onClick={() => { router.push(`/rooms?edit=${contextMenu.roomId}`); closeContextMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar sala
          </button>
          <button
            onClick={() => { /* TODO: open move-to-floor modal */ closeContextMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            Mover para outro piso
          </button>
          <button
            onClick={() => { /* TODO: confirm delete */ closeContextMenu(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar sala
          </button>
        </div>
      )}

      {/* Tooltip */}
      {hoveredRoom && (
        <Tooltip
          targetRef={{ current: roomRefs.current.get(hoveredRoom) ?? null } as React.RefObject<HTMLElement>}
          visible={!!hoveredRoom}
          interactive
          onTooltipEnter={handleTooltipEnter}
          onTooltipLeave={handleTooltipLeave}
        >
          <div onClick={handleTooltipClick}>
            {(() => {
              const rws = floorNodes.flatMap((f) => f.rooms).find((r) => r.room.id === hoveredRoom);
              if (!rws) return null;

              const roomEquip = rws.roomEquipment;
              const equipIds = new Set(roomEquip.map((e) => e.id));
              const roomMaint = maintenance.filter(
                (m) => equipIds.has(m.equipmentId) && OPEN_MAINTENANCE_STATUSES.includes(m.status)
              );
              const roomRequests = assistanceRequests.filter(
                (a) => a.roomId === rws.room.id && OPEN_REQUEST_STATUSES.includes(a.status)
              );

              return (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-600 pb-1">
                    <div className="font-semibold text-base">
                      {rws.room.name}
                      {rws.room.code && <span className="text-slate-400 font-normal ml-2 text-sm">({rws.room.code})</span>}
                      {rws.room.building && <span className="text-slate-400 font-normal ml-2 text-sm">{rws.room.building}</span>}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-2" />
                  </div>

                  {/* Equipment */}
                  {rws.equipmentCount === 0 ? (
                    <div className="text-slate-400 text-sm flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      Sem equipamentos atribuídos
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Equipamentos</div>
                      <div className="space-y-0.5">
                        {roomEquip.map((eq) => (
                          <button
                            key={eq.id}
                            onClick={(e) => { e.stopPropagation(); handleEquipmentClick(eq.id); }}
                            className="w-full flex items-center gap-2 text-xs hover:bg-slate-700 rounded px-1.5 py-0.5 -mx-1.5 transition-colors group/eq"
                          >
                            <Monitor className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate group-hover/eq:underline">{eq.name}</span>
                            <span className={`ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              eq.status === 'ACTIVE' ? 'bg-green-900/40 text-green-300' :
                              eq.status === 'MAINTENANCE' ? 'bg-yellow-900/40 text-yellow-300' :
                              eq.status === 'INACTIVE' ? 'bg-gray-900/40 text-gray-300' :
                              'bg-red-900/40 text-red-300'
                            }`}>
                              {eq.status === 'ACTIVE' ? 'Ativo' :
                               eq.status === 'MAINTENANCE' ? 'Manutenção' :
                               eq.status === 'INACTIVE' ? 'Inativo' :
                               eq.status === 'RETIRED' ? 'Reformado' :
                               eq.status === 'LOST' ? 'Perdido' : 'Roubado'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Open incidents */}
                  {roomMaint.length === 0 && roomRequests.length === 0 ? (
                    <div className="text-slate-400 text-sm flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Sem ocorrências abertas
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Ocorrências Abertas</div>
                      <div className="space-y-0.5">
                        {roomMaint.map((m) => (
                          <button
                            key={m.id}
                            onClick={(e) => { e.stopPropagation(); handleMaintenanceClick(m.id); }}
                            className="w-full flex items-center gap-2 text-xs hover:bg-slate-700 rounded px-1.5 py-0.5 -mx-1.5 transition-colors group/maint"
                          >
                            {CRITICAL_PRIORITIES.includes(m.priority)
                              ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              : <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            }
                            <span className="truncate group-hover/maint:underline">{m.title}</span>
                            <span className={`ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              m.status === 'OPEN' ? 'bg-blue-900/40 text-blue-300' :
                              m.status === 'IN_PROGRESS' ? 'bg-yellow-900/40 text-yellow-300' :
                              'bg-orange-900/40 text-orange-300'
                            }`}>
                              {m.status === 'OPEN' ? 'Aberto' :
                               m.status === 'IN_PROGRESS' ? 'Em curso' : 'Aguarda peças'}
                            </span>
                          </button>
                        ))}
                        {roomRequests.map((a) => (
                          <button
                            key={a.id}
                            onClick={(e) => { e.stopPropagation(); handleRequestClick(a.id); }}
                            className="w-full flex items-center gap-2 text-xs hover:bg-slate-700 rounded px-1.5 py-0.5 -mx-1.5 transition-colors group/req"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                            <span className="truncate group-hover/req:underline">{a.title}</span>
                            <span className="ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/40 text-blue-300">
                              {a.status === 'PENDING' ? 'Pendente' : 'Em curso'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-1 border-t border-slate-700 text-[10px] text-slate-500 text-center">
                    Clique para navegar • Botão direito para mais opções
                  </div>
                </div>
              );
            })()}
          </div>
        </Tooltip>
      )}
    </div>
  );
}
