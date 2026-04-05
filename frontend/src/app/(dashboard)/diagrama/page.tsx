'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { roomsApi, equipmentApi, maintenanceApi, assistanceRequestsApi } from '@/lib/api';
import Tooltip from '@/components/ui/Tooltip';
import { Wrench, AlertTriangle, Monitor, CheckCircle, XCircle } from 'lucide-react';

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
  statusColor: string;
  statusLabel: string;
}

const OPEN_MAINTENANCE_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'];
const OPEN_REQUEST_STATUSES = ['PENDING', 'IN_PROGRESS'];
const CRITICAL_PRIORITIES = ['CRITICAL', 'HIGH'];

const FLOOR_ORDER: Record<string, number> = {
  '3': 0,
  '2': 1,
  '1': 2,
  '0': 3,
  '-1': 4,
  '-2': 5,
};

function getRoomStatusColor(room: RoomWithStatus): string {
  if (room.equipmentCount === 0) return 'bg-gray-200 border-gray-300';
  if (room.hasCritical) return 'bg-red-50 border-red-400';
  if (room.hasUrgent) return 'bg-orange-50 border-orange-400';
  if (room.openTickets > 0 || room.openRequestCount > 0) return 'bg-yellow-50 border-yellow-400';
  return 'bg-green-50 border-green-400';
}

function getRoomStatusDot(room: RoomWithStatus): string {
  if (room.equipmentCount === 0) return 'bg-gray-400';
  if (room.hasCritical) return 'bg-red-500';
  if (room.hasUrgent) return 'bg-orange-500';
  if (room.openTickets > 0 || room.openRequestCount > 0) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function DiagramaEdificio() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTicket[]>([]);
  const [assistanceRequests, setAssistanceRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const roomRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hoveredRef = useRef<HTMLDivElement | null>(null);

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

      const allRooms: Room[] = (Array.isArray(roomsData) ? roomsData : []).filter(
        (r: Room) => r.institutionId === user.institutionId && (r as any).deletedAt == null
      );
      const allEquip: Equipment[] = (Array.isArray(equipData) ? equipData : []).filter(
        (e: Equipment) => e.institutionId === user.institutionId && (e as any).deletedAt == null
      );
      const allMaint: MaintenanceTicket[] = (Array.isArray(maintData) ? maintData : []).filter(
        (m: MaintenanceTicket) => m.institutionId === user.institutionId && (m as any).deletedAt == null
      );
      const allAssist: AssistanceRequest[] = (Array.isArray(assistData) ? assistData : []).filter(
        (a: AssistanceRequest) => a.institutionId === user.institutionId
      );

      setRooms(allRooms);
      setEquipment(allEquip);
      setMaintenance(allMaint);
      setAssistanceRequests(allAssist);
    } catch (err) {
      console.error('Erro ao carregar dados do diagrama:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build room status map
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
    const hasUrgent = openTickets.some((t) => t.priority === 'HIGH');

    const data: RoomWithStatus = {
      room,
      equipmentCount: roomEquip.length,
      roomEquipment: roomEquip,
      openTickets: openTickets.length,
      hasCritical,
      hasUrgent,
      openRequestCount: openRequests.length,
      statusColor: '',
      statusLabel: '',
    };
    data.statusColor = getRoomStatusColor(data);

    if (roomEquip.length === 0) {
      data.statusLabel = 'Sem equipamentos';
    } else if (hasCritical) {
      data.statusLabel = `${openTickets.length} ocorrência(s) crítica`;
    } else if (hasUrgent) {
      data.statusLabel = `${openTickets.length} ocorrência(s) urgente`;
    } else if (openTickets.length > 0 || openRequests.length > 0) {
      data.statusLabel = `${openTickets.length + openRequests.length} ocorrência(s) abertas`;
    } else {
      data.statusLabel = 'Sem ocorrências';
    }

    return data;
  });

  // Group by floor
  const floorMap = new Map<string, RoomWithStatus[]>();
  for (const rws of roomsWithStatus) {
    const floor = rws.room.floor ?? 'Sem piso';
    if (!floorMap.has(floor)) floorMap.set(floor, []);
    floorMap.get(floor)!.push(rws);
  }

  // Sort floors: highest first (3, 2, 1, 0, -1, -2), then alphabetically for non-numeric
  const sortedFloors = [...floorMap.keys()].sort((a, b) => {
    const aNum = FLOOR_ORDER[a] ?? 99;
    const bNum = FLOOR_ORDER[b] ?? 99;
    return aNum - bNum;
  });

  const handleMouseEnter = useCallback((roomId: string, el: HTMLDivElement) => {
    hoveredRef.current = el;
    setHoveredRoom(roomId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setHoveredRoom(null);
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-20 w-40 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Diagrama do Edifício</h1>
        <p className="text-slate-500 mt-1">Vista geral do estado das salas e equipamentos por piso</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 p-3 bg-white rounded-lg border border-slate-200 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-600">Tudo OK</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-600">Ocorrências abertas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-slate-600">Ocorrências urgentes</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-600">Ocorrências críticas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-slate-600">Sem equipamentos</span>
        </div>
      </div>

      {sortedFloors.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">Nenhuma sala registada</p>
          <p className="text-sm mt-1">Adicione salas para visualizar o diagrama do edifício.</p>
        </div>
      )}

      {/* Floors */}
      <div className="space-y-8">
        {sortedFloors.map((floor) => {
          const floorRooms = floorMap.get(floor)!;
          return (
            <div key={floor}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full min-w-[80px] text-center">
                  {floor === 'Sem piso' ? floor : `Piso ${floor}`}
                </span>
                <span className="text-xs text-slate-400">{floorRooms.length} sala(s)</span>
              </div>
              <div className="flex flex-wrap gap-4 pl-[80px]">
                {floorRooms.map((rws) => {
                  const refKey = rws.room.id;
                  return (
                    <div
                      key={rws.room.id}
                      ref={(el) => {
                        if (el) roomRefs.current.set(refKey, el);
                      }}
                      className={`relative border-2 rounded-lg p-3 min-w-[160px] max-w-[220px] cursor-default transition-all hover:shadow-md ${rws.statusColor}`}
                      onMouseEnter={(e) => handleMouseEnter(refKey, e.currentTarget)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${getRoomStatusDot(rws)}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-800 truncate">{rws.room.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {rws.equipmentCount === 0
                              ? 'Sem equipamentos'
                              : `${rws.equipmentCount} equipamento(s)`}
                          </div>
                        </div>
                      </div>
                      {(rws.openTickets > 0 || rws.openRequestCount > 0) && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium">
                          <Wrench className="w-3 h-3" />
                          <span>
                            {rws.openTickets > 0 && `${rws.openTickets} manutenção`}
                            {rws.openTickets > 0 && rws.openRequestCount > 0 && ', '}
                            {rws.openRequestCount > 0 && `${rws.openRequestCount} pedido`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredRoom && (
        <Tooltip
          targetRef={{ current: roomRefs.current.get(hoveredRoom) ?? null } as React.RefObject<HTMLElement>}
          visible={!!hoveredRoom}
        >
          {(() => {
            const rws = roomsWithStatus.find((r) => r.room.id === hoveredRoom);
            if (!rws) return null;
            return (
              <div className="space-y-2">
                <div className="font-semibold text-base border-b border-slate-600 pb-1">
                  {rws.room.name}
                  {rws.room.code && <span className="text-slate-400 font-normal ml-2 text-sm">({rws.room.code})</span>}
                  {rws.room.building && <span className="text-slate-400 font-normal ml-2 text-sm">{rws.room.building}</span>}
                </div>

                {rws.equipmentCount === 0 ? (
                  <div className="text-slate-400 text-sm flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    Sem equipamentos atribuídos
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Equipamentos</div>
                    <div className="space-y-1">
                      {rws.roomEquipment.map((eq) => (
                        <div key={eq.id} className="flex items-center gap-2 text-xs">
                          <Monitor className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{eq.name}</span>
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rws.openTickets === 0 && rws.openRequestCount === 0 ? (
                  <div className="text-slate-400 text-sm flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Sem ocorrências abertas
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Ocorrências Abertas</div>
                    <div className="space-y-1">
                      {maintenance
                        .filter((m) => rws.roomEquipment.some((e) => e.id === m.equipmentId) && OPEN_MAINTENANCE_STATUSES.includes(m.status))
                        .map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-xs">
                            {CRITICAL_PRIORITIES.includes(m.priority)
                              ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              : <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            }
                            <span className="truncate">{m.title}</span>
                            <span className={`ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              m.status === 'OPEN' ? 'bg-blue-900/40 text-blue-300' :
                              m.status === 'IN_PROGRESS' ? 'bg-yellow-900/40 text-yellow-300' :
                              'bg-orange-900/40 text-orange-300'
                            }`}>
                              {m.status === 'OPEN' ? 'Aberto' :
                               m.status === 'IN_PROGRESS' ? 'Em curso' : 'Aguarda peças'}
                            </span>
                          </div>
                        ))}
                      {assistanceRequests
                        .filter((a) => a.roomId === rws.room.id && OPEN_REQUEST_STATUSES.includes(a.status))
                        .map((a) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                            <span className="truncate">{a.title}</span>
                            <span className="ml-auto flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/40 text-blue-300">
                              {a.status === 'PENDING' ? 'Pendente' : 'Em curso'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Tooltip>
      )}
    </div>
  );
}
