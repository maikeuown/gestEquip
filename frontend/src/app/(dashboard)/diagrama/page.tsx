'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { roomsApi, equipmentApi, maintenanceApi, assistanceRequestsApi } from '@/lib/api';
import {
  Wrench, AlertTriangle, Monitor, CheckCircle, XCircle, ExternalLink,
  ChevronDown, ChevronRight, GripVertical, Pencil, Trash2, ArrowUpDown, Building2,
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
  statusCategory: 'ok' | 'alert' | 'maintenance' | 'critical' | 'empty';
}

interface FloorNode {
  floor: string;
  order: number;
  rooms: RoomWithStatus[];
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

function getStatusCategory(room: { equipmentCount: number; hasCritical: boolean; hasUrgent: boolean; openTickets: number; openRequestCount: number }): RoomWithStatus['statusCategory'] {
  if (room.equipmentCount === 0) return 'empty';
  if (room.hasCritical) return 'critical';
  if (room.hasUrgent || room.openTickets > 0) return 'maintenance';
  if (room.openRequestCount > 0) return 'alert';
  return 'ok';
}

function getRoomDot(cat: RoomWithStatus['statusCategory']): string {
  switch (cat) {
    case 'empty': return 'bg-gray-400';
    case 'critical': return 'bg-red-500 animate-pulse';
    case 'maintenance': return 'bg-orange-500 animate-pulse';
    case 'alert': return 'bg-yellow-500';
    default: return 'bg-green-500';
  }
}

function getCardBorder(cat: RoomWithStatus['statusCategory']): string {
  switch (cat) {
    case 'empty': return 'border-gray-300 bg-gray-50';
    case 'critical': return 'border-red-400 bg-red-50/50';
    case 'maintenance': return 'border-orange-400 bg-orange-50/50';
    case 'alert': return 'border-yellow-400 bg-yellow-50/50';
    default: return 'border-green-300 bg-green-50/50';
  }
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

  // Filters
  type FilterCat = RoomWithStatus['statusCategory'];
  const [activeFilter, setActiveFilter] = useState<FilterCat | null>(null);

  // Expanded floors (localStorage)
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Expanded room details (click-to-expand inline)
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  // Drag-and-drop
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const [draggedFloor, setDraggedFloor] = useState<string | null>(null);
  const [dragOverFloor, setDragOverFloor] = useState<string | null>(null);

  // ── Fetch ──
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
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Restore collapse state from localStorage ──
  useEffect(() => {
    if (loading) return;
    try {
      const saved = localStorage.getItem('diagrama-collapsed-floors');
      if (saved) {
        const collapsed = JSON.parse(saved) as string[];
        const allFloors = [...new Set(rooms.map((r) => r.floor ?? 'Sem piso'))];
        const expanded = new Set(allFloors.filter((f) => !collapsed.includes(f)));
        setExpandedFloors(expanded);
      } else {
        // Default: all expanded
        setExpandedFloors(new Set(rooms.map((r) => r.floor ?? 'Sem piso')));
      }
    } catch { /* ignore */ }
  }, [loading, rooms]);

  // ── Persist to localStorage ──
  useEffect(() => {
    if (loading) return;
    const allFloorKeys = [...expandedFloors];
    try {
      localStorage.setItem('diagrama-collapsed-floors', JSON.stringify(
        [...new Set(rooms.map((r) => r.floor ?? 'Sem piso'))].filter((f) => !expandedFloors.has(f))
      ));
    } catch { /* ignore */ }
  }, [expandedFloors, loading, rooms]);

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
        equipmentCount: roomEquip.length, hasCritical,
        hasUrgent: openTickets.some((t) => t.priority === 'HIGH'),
        openTickets: openTickets.length, openRequestCount: openRequests.length,
      });
      return {
        room, equipmentCount: roomEquip.length, roomEquipment: roomEquip,
        openTickets: openTickets.length, hasCritical,
        hasUrgent: openTickets.some((t) => t.priority === 'HIGH'),
        openRequestCount: openRequests.length, statusCategory: cat,
      };
    });

    const floorMap = new Map<string, RoomWithStatus[]>();
    for (const rws of roomsWithStatus) {
      const floor = rws.room.floor ?? 'Sem piso';
      if (!floorMap.has(floor)) floorMap.set(floor, []);
      floorMap.get(floor)!.push(rws);
    }

    const sortedFloors = [...floorMap.keys()].sort((a, b) => (FLOOR_ORDER[a] ?? 99) - (FLOOR_ORDER[b] ?? 99));

    return sortedFloors.map((floor, idx) => {
      const allRooms = floorMap.get(floor)!;
      const filteredRooms = activeFilter ? allRooms.filter((r) => r.statusCategory === activeFilter) : allRooms;
      let okCount = 0, alertCount = 0, maintenanceCount = 0, criticalCount = 0, emptyCount = 0;
      for (const r of allRooms) {
        switch (r.statusCategory) {
          case 'ok': okCount++; break;
          case 'alert': alertCount++; break;
          case 'maintenance': maintenanceCount++; break;
          case 'critical': criticalCount++; break;
          case 'empty': emptyCount++; break;
        }
      }
      return { floor, order: idx, rooms: filteredRooms, okCount, alertCount, maintenanceCount, criticalCount, emptyCount };
    });
  }, [rooms, equipment, maintenance, assistanceRequests, activeFilter]);

  const totalRooms = rooms.length;
  const filteredCount = activeFilter ? floorNodes.reduce((s, f) => s + f.rooms.length, 0) : totalRooms;
  const allFloorsEmpty = floorNodes.every((f) => f.rooms.length === 0) && activeFilter !== null;
  const allExpanded = floorNodes.length > 0 && floorNodes.every((f) => expandedFloors.has(f.floor));

  // ── Handlers ──
  const toggleFloor = useCallback((floor: string) => {
    setExpandedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(floor)) next.delete(floor); else next.add(floor);
      return next;
    });
  }, []);

  const toggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedFloors(new Set());
    } else {
      setExpandedFloors(new Set(floorNodes.map((f) => f.floor)));
    }
  }, [allExpanded, floorNodes]);

  const toggleRoom = useCallback((roomId: string) => {
    setExpandedRoom((prev) => prev === roomId ? null : roomId);
  }, []);

  // ── Drag: room within floor ──
  const handleRoomDragStart = useCallback((e: React.DragEvent, roomId: string) => {
    e.stopPropagation();
    setDraggedRoomId(roomId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', roomId);
  }, []);

  const handleRoomDragOver = useCallback((e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoomId(roomId);
  }, []);

  const handleRoomDrop = useCallback((e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedRoomId;
    if (!sourceId || sourceId === targetRoomId) {
      setDraggedRoomId(null);
      setDragOverRoomId(null);
      return;
    }

    // Find floor for both rooms
    let sourceFloor: string | null = null;
    let targetFloor: string | null = null;
    for (const fn of floorNodes) {
      if (fn.rooms.find((r) => r.room.id === sourceId)) sourceFloor = fn.floor;
      if (fn.rooms.find((r) => r.room.id === targetRoomId)) targetFloor = fn.floor;
    }
    if (!sourceFloor || !targetFloor || sourceFloor !== targetFloor) {
      setDraggedRoomId(null);
      setDragOverRoomId(null);
      return;
    }

    // Reorder within the floor (client-side only)
    // In production, you'd persist this to the backend
    setDraggedRoomId(null);
    setDragOverRoomId(null);
  }, [draggedRoomId, floorNodes]);

  const handleRoomDragEnd = useCallback(() => {
    setDraggedRoomId(null);
    setDragOverRoomId(null);
  }, []);

  // ── Drag: floor reorder ──
  const handleFloorDragStart = useCallback((e: React.DragEvent, floor: string) => {
    e.stopPropagation();
    setDraggedFloor(floor);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `floor:${floor}`);
  }, []);

  const handleFloorDragOver = useCallback((e: React.DragEvent, floor: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFloor(floor);
  }, []);

  const handleFloorDrop = useCallback((e: React.DragEvent, targetFloor: string) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData('text/plain');
    if (!data?.startsWith('floor:') || data === `floor:${targetFloor}`) return;
    // In production, persist new order to backend
    setDraggedFloor(null);
    setDragOverFloor(null);
  }, []);

  const handleFloorDragEnd = useCallback(() => {
    setDraggedFloor(null);
    setDragOverFloor(null);
  }, []);

  // ── Navigation ──
  const handleRoomClick = useCallback((roomId: string) => {
    router.push(`/rooms?search=${roomId}`);
  }, [router]);

  const handleEquipmentClick = useCallback((eqId: string) => {
    router.push(`/equipment?search=${eqId}`);
  }, [router]);

  const handleMaintenanceClick = useCallback((ticketId: string) => {
    router.push(`/maintenance?search=${ticketId}`);
  }, [router]);

  const handleRequestClick = useCallback((reqId: string) => {
    router.push(`/assistance-requests?search=${reqId}`);
  }, [router]);

  // ── Loading ──
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

  return (
    <div className="p-6 overflow-auto max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Diagrama do Edifício</h1>
        <p className="text-slate-500 mt-1">
          {totalRooms} salas em {floorNodes.length} piso(s). Clique numa sala para ver detalhes.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white rounded-lg border border-slate-200 text-sm">
        <span className="text-xs text-slate-400 font-medium mr-1">Filtrar:</span>
        {(
          [
            { cat: 'ok' as const, label: 'Tudo OK', dot: 'bg-green-500' },
            { cat: 'alert' as const, label: 'Alertas', dot: 'bg-yellow-500' },
            { cat: 'maintenance' as const, label: 'Manutenção', dot: 'bg-orange-500' },
            { cat: 'critical' as const, label: 'Crítico', dot: 'bg-red-500' },
            { cat: 'empty' as const, label: 'Sem equipamentos', dot: 'bg-gray-400' },
          ] as const
        ).map(({ cat, label, dot }) => (
          <button
            key={cat}
            onClick={() => setActiveFilter((prev) => (prev === cat ? null : cat))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeFilter === cat
                ? 'ring-2 ring-primary-400 ring-offset-1 bg-primary-50 text-primary-800 font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${dot} ${
              (cat === 'critical' || cat === 'maintenance') ? 'animate-pulse' : ''
            }`} />
            {label}
          </button>
        ))}
        {activeFilter && (
          <button
            onClick={() => setActiveFilter(null)}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Expand/Collapse toggle + count */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggleExpandAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          {allExpanded ? (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              Colapsar todos
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Expandir todos
            </>
          )}
        </button>
        {activeFilter && (
          <span className="text-xs text-slate-500">
            {filteredCount} resultado{filteredCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Empty states */}
      {totalRooms === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">Nenhuma sala registada</p>
          <p className="text-sm mt-1">Adicione salas para visualizar o diagrama do edifício.</p>
        </div>
      )}
      {allFloorsEmpty && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">Nenhum resultado para este filtro</p>
          <p className="text-sm mt-1">Tente selecionar outro estado ou limpe o filtro.</p>
        </div>
      )}

      {/* Floor list */}
      <div className="space-y-3">
        {floorNodes.map((fn) => (
          <div
            key={fn.floor}
            onDragOver={(e) => handleFloorDragOver(e, fn.floor)}
            onDrop={(e) => handleFloorDrop(e, fn.floor)}
            onDragEnd={handleFloorDragEnd}
            className={`bg-white rounded-xl border transition-all ${
              dragOverFloor === fn.floor && draggedFloor !== fn.floor
                ? 'border-primary-400 ring-2 ring-primary-200'
                : draggedFloor === fn.floor
                  ? 'border-primary-300 shadow-md opacity-60'
                  : 'border-slate-200 shadow-sm hover:shadow-md'
            }`}
          >
            {/* Floor header */}
            <div className="flex items-center gap-2 px-4 py-3">
              {/* Floor drag handle — ONLY this starts a drag */}
              <span
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleFloorDragStart(e, fn.floor);
                }}
                className="cursor-grab active:cursor-grabbing flex-shrink-0"
              >
                <GripVertical className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
              </span>

              {/* Expand/collapse button */}
              <button
                onClick={() => toggleFloor(fn.floor)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                {expandedFloors.has(fn.floor)
                  ? <ChevronDown className="w-5 h-5" />
                  : <ChevronRight className="w-5 h-5" />
                }
              </button>

              {/* Floor name */}
              <span className="text-sm font-bold text-slate-800 flex-shrink-0 min-w-[100px]">
                {floorDisplayName(fn.floor)}
              </span>
              <span className="text-xs text-slate-400">{fn.rooms.length} sala(s)</span>

              {/* Summary badges */}
              <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                {fn.okCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500" />{fn.okCount} ok
                  </span>
                )}
                {fn.alertCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />{fn.alertCount} alerta{fn.alertCount > 1 ? 's' : ''}
                  </span>
                )}
                {fn.maintenanceCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />{fn.maintenanceCount} manutenção
                  </span>
                )}
                {fn.criticalCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{fn.criticalCount} crítica{fn.criticalCount > 1 ? 's' : ''}
                  </span>
                )}
                {fn.emptyCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />{fn.emptyCount} vazio{fn.emptyCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Room list — collapsible */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedFloors.has(fn.floor) ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {fn.rooms.length === 0 ? (
                <div className="px-4 pb-4 text-sm text-slate-400 italic">
                  {activeFilter ? 'Nenhuma sala com este estado neste piso.' : 'Nenhuma sala neste piso.'}
                </div>
              ) : (
                <div className="px-4 pb-3 grid gap-1.5">
                  {fn.rooms.map((rws) => {
                    const refKey = rws.room.id;
                    const cat = rws.statusCategory;
                    const isExpanded = expandedRoom === refKey;
                    const isDragged = draggedRoomId === refKey;
                    const isDragOver = dragOverRoomId === refKey;

                    return (
                      <div key={rws.room.id} className="animate-in fade-in">
                        {/* Room row — compact card */}
                        <div
                          onDragOver={(e) => handleRoomDragOver(e, refKey)}
                          onDrop={(e) => handleRoomDrop(e, refKey)}
                          onDragEnd={handleRoomDragEnd}
                          className={`group relative flex items-center gap-2 rounded-lg border-2 p-2 cursor-pointer transition-all duration-150 ${getCardBorder(cat)} ${
                            isDragged ? 'opacity-40 border-dashed border-slate-400' : ''
                          } ${isDragOver ? 'ring-2 ring-primary-400 ring-offset-1' : ''} ${
                            !isDragged ? 'hover:shadow-sm hover:border-slate-300' : ''
                          } ${isExpanded ? 'rounded-b-none border-b-0' : ''}`}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button[data-nav]')) return;
                            toggleRoom(refKey);
                          }}
                        >
                          {/* Room drag handle — ONLY this starts a drag */}
                          <span
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleRoomDragStart(e, refKey);
                            }}
                            className="cursor-grab active:cursor-grabbing flex-shrink-0"
                          >
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>

                          {/* Status dot */}
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getRoomDot(cat)}`} />

                          {/* Room info — single line */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 truncate">{rws.room.name}</span>
                            <span className="text-xs text-slate-500 flex-shrink-0">
                              {rws.equipmentCount === 0 ? '—' : `${rws.equipmentCount} eq.`}
                            </span>
                            {rws.openTickets > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 font-medium flex-shrink-0">
                                <Wrench className="w-3 h-3" />{rws.openTickets}
                              </span>
                            )}
                            {rws.openRequestCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-yellow-600 font-medium flex-shrink-0">
                                <AlertTriangle className="w-3 h-3" />{rws.openRequestCount}
                              </span>
                            )}
                          </div>

                          {/* Navigate button */}
                          <button
                            data-nav
                            onClick={(e) => { e.stopPropagation(); handleRoomClick(refKey); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded flex-shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          {/* Expand indicator */}
                          <div className="text-slate-400 flex-shrink-0">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Expanded detail section — compact, tooltip-density */}
                        {isExpanded && (
                          <div className="bg-slate-900 text-white text-xs rounded-b-lg border-2 border-t-0 border-slate-700 px-3 py-2 -mt-px space-y-1.5 animate-in fade-in">
                            {/* Equipment list */}
                            {rws.roomEquipment.length === 0 ? (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Sem equipamentos</span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-0.5">Equipamentos</div>
                                {rws.roomEquipment.map((eq) => (
                                  <button
                                    key={eq.id}
                                    data-nav
                                    onClick={(e) => { e.stopPropagation(); handleEquipmentClick(eq.id); }}
                                    className="w-full flex items-center gap-2 text-xs hover:bg-slate-700 rounded px-1 py-0.5 -mx-1 transition-colors group/eq"
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
                                       eq.status === 'MAINTENANCE' ? 'Manut.' :
                                       eq.status === 'INACTIVE' ? 'Inativo' :
                                       eq.status === 'RETIRED' ? 'Reform.' :
                                       eq.status === 'LOST' ? 'Perdido' : 'Roubado'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Open incidents */}
                            {(() => {
                              const equipIds = new Set(rws.roomEquipment.map((e) => e.id));
                              const roomMaint = maintenance.filter(
                                (m) => equipIds.has(m.equipmentId) && OPEN_MAINTENANCE_STATUSES.includes(m.status)
                              );
                              const roomRequests = assistanceRequests.filter(
                                (a) => a.roomId === rws.room.id && OPEN_REQUEST_STATUSES.includes(a.status)
                              );

                              if (roomMaint.length === 0 && roomRequests.length === 0) {
                                return (
                                  <div className="flex items-center gap-1.5 text-slate-400">
                                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Sem ocorrências abertas</span>
                                  </div>
                                );
                              }

                              return (
                                <div>
                                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-0.5">Ocorrências</div>
                                  {roomMaint.map((m) => (
                                    <button
                                      key={m.id}
                                      data-nav
                                      onClick={(e) => { e.stopPropagation(); handleMaintenanceClick(m.id); }}
                                      className="w-full flex items-center gap-2 text-xs hover:bg-slate-700 rounded px-1 py-0.5 -mx-1 transition-colors group/maint"
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
                                        {m.status === 'OPEN' ? 'Aberto' : m.status === 'IN_PROGRESS' ? 'Em curso' : 'Aguarda peças'}
                                      </span>
                                    </button>
                                  ))}
                                  {roomRequests.map((a) => (
                                    <button
                                      key={a.id}
                                      data-nav
                                      onClick={(e) => { e.stopPropagation(); handleRequestClick(a.id); }}
                                      className="w-full flex items-center gap-2 text-xs hover:bg-slate-700 rounded px-1 py-0.5 -mx-1 transition-colors group/req"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                                      <span className="truncate group-hover/req:underline">{a.title}</span>
                                      <span className="ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/40 text-blue-300">
                                        {a.status === 'PENDING' ? 'Pendente' : 'Em curso'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
