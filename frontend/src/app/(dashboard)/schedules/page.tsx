'use client';
import { useEffect, useState, useMemo } from 'react';
import { Clock, Plus, Pencil, Trash2, User, DoorOpen, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import { schedulesApi, roomsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Schedule, Room, User as UserType, ScheduleType, DayOfWeek } from '@/types';
import toast from 'react-hot-toast';

const dayLabels: Record<string, string> = {
  MONDAY: 'Segunda', TUESDAY: 'Terça', WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta', FRIDAY: 'Sexta',
};
const days: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

const timeSlots = [
  '07:30 - 08:30', '08:30 - 09:30', '09:30 - 10:30', '10:30 - 11:30',
  '11:30 - 12:30', '12:30 - 13:30', '13:30 - 14:30', '14:30 - 15:30',
  '15:30 - 16:30', '16:30 - 17:30', '17:30 - 18:30', '18:30 - 19:30',
  '19:30 - 20:30', '20:30 - 21:30',
];

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

type Tab = 'ROOM_SCHEDULE' | 'TEACHER_SCHEDULE';

interface ScheduleForm {
  type: ScheduleType;
  roomId?: string;
  userId?: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subject?: string;
  teacher?: string;
}

const emptyForm = (type: ScheduleType): ScheduleForm => ({
  type,
  day: 'MONDAY',
  startTime: '08:30',
  endTime: '09:30',
  subject: '',
  teacher: '',
});

export default function SchedulesPage() {
  const { user: currentUser } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('ROOM_SCHEDULE');

  // Filters
  const [filterRoomId, setFilterRoomId] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm('ROOM_SCHEDULE'));

  const role = currentUser?.role;
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isTechnician = role === 'TECHNICIAN';
  const isTeacher = role === 'TEACHER';

  const canEditRoomSchedules = isAdmin || isTechnician;
  const canEditTeacherSchedules = isAdmin || isTeacher;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesData, roomsData, usersData] = await Promise.all([
        schedulesApi.list(),
        roomsApi.list(),
        isAdmin || isTechnician ? usersApi.list({ role: 'TEACHER' }) : Promise.resolve([]),
      ]);
      setSchedules(schedulesData);
      setRooms(roomsData);
      if (Array.isArray(usersData)) {
        setTeachers(usersData);
      }
    } catch {
      toast.error('Erro ao carregar horários');
    } finally {
      setLoading(false);
    }
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    let result = schedules.filter(s => s.type === tab);
    if (tab === 'ROOM_SCHEDULE' && filterRoomId) {
      result = result.filter(s => s.roomId === filterRoomId);
    }
    if (tab === 'TEACHER_SCHEDULE' && filterUserId) {
      result = result.filter(s => s.userId === filterUserId);
    }
    // Teachers only see their own schedules
    if (isTeacher && tab === 'TEACHER_SCHEDULE') {
      result = result.filter(s => s.userId === currentUser?.id);
    }
    return result;
  }, [schedules, tab, filterRoomId, filterUserId, isTeacher, currentUser?.id]);

  const canEditSchedule = (schedule: Schedule) => {
    if (schedule.type === 'ROOM_SCHEDULE') return canEditRoomSchedules;
    if (schedule.type === 'TEACHER_SCHEDULE') {
      if (isAdmin) return true;
      if (isTeacher) return schedule.userId === currentUser?.id;
    }
    return false;
  };

  // Modal handlers
  const openCreate = () => {
    const defaultForm = emptyForm(tab);
    if (tab === 'TEACHER_SCHEDULE' && isTeacher) {
      defaultForm.userId = currentUser?.id;
    }
    setForm(defaultForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (schedule: Schedule) => {
    setForm({
      type: schedule.type,
      roomId: schedule.roomId || undefined,
      userId: schedule.userId || undefined,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subject: schedule.subject || '',
      teacher: schedule.teacher || '',
    });
    setEditingId(schedule.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await schedulesApi.update(editingId, form);
        toast.success('Horário atualizado');
      } else {
        await schedulesApi.create(form);
        toast.success('Horário criado');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao guardar horário');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que quer eliminar este horário?')) return;
    try {
      await schedulesApi.delete(id);
      toast.success('Horário eliminado');
      loadData();
    } catch {
      toast.error('Erro ao eliminar horário');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;

  const now = new Date();
  const dayIndex = now.getDay();
  const currentDay = dayIndex >= 1 && dayIndex <= 5 ? days[dayIndex - 1] : 'MONDAY';
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const canCreate = tab === 'ROOM_SCHEDULE' ? canEditRoomSchedules : canEditTeacherSchedules;

  // Schedule grid helpers
  const getScheduleMap = () => {
    const map = new Map<string, { schedule: Schedule; startSlot: number; endSlot: number }>();
    days.forEach(day => {
      const daySchedules = filteredSchedules.filter(s => s.day === day);
      daySchedules.forEach(schedule => {
        const scheduleStart = timeToMinutes(schedule.startTime);
        const scheduleEnd = timeToMinutes(schedule.endTime);
        let startSlot = -1;
        let endSlot = -1;
        timeSlots.forEach((slot, idx) => {
          const [slotStart] = slot.split(' - ');
          const slotStartMin = timeToMinutes(slotStart);
          if (slotStartMin >= scheduleStart && slotStartMin < scheduleEnd) {
            if (startSlot === -1) startSlot = idx;
            endSlot = idx;
          }
        });
        if (startSlot !== -1) {
          map.set(`${day}-${startSlot}`, { schedule, startSlot, endSlot });
        }
      });
    });
    return map;
  };

  const scheduleMap = getScheduleMap();

  const getCoveredBy = (day: string, slotIndex: number) => {
    for (const [key, value] of scheduleMap) {
      if (key.startsWith(day) && slotIndex > value.startSlot && slotIndex <= value.endSlot) return true;
    }
    return false;
  };

  const isCurrentSlot = (day: string, slotStart: string, slotEnd: string) => {
    if (day !== currentDay) return false;
    const nowMin = timeToMinutes(currentTime);
    return nowMin >= timeToMinutes(slotStart) && nowMin < timeToMinutes(slotEnd);
  };

  const getScheduleLabel = (schedule: Schedule) => {
    if (tab === 'ROOM_SCHEDULE') {
      const room = rooms.find(r => r.id === schedule.roomId);
      return { primary: schedule.subject || 'Aula', secondary: room?.name || '', tertiary: room?.building || '' };
    }
    const userName = schedule.user ? `${schedule.user.firstName} ${schedule.user.lastName}` : schedule.teacher || '';
    return { primary: schedule.subject || 'Aula', secondary: userName, tertiary: '' };
  };

  // Room availability (only shown on room tab with no filter)
  const showAvailability = tab === 'ROOM_SCHEDULE' && !filterRoomId;

  return (
    <div>
      <Header title="Horários" />
      <div className="p-6 space-y-6">
        {/* Current Time */}
        <div className="card p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700 font-medium">Horário Atual</p>
              <p className="text-lg font-bold text-blue-900">{currentTime} &bull; {dayLabels[currentDay]}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => { setTab('ROOM_SCHEDULE'); setFilterRoomId(''); setFilterUserId(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'ROOM_SCHEDULE'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DoorOpen className="w-4 h-4" /> Horários de Salas
          </button>
          <button
            onClick={() => { setTab('TEACHER_SCHEDULE'); setFilterRoomId(''); setFilterUserId(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'TEACHER_SCHEDULE'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" /> Horários de Professores
          </button>
        </div>

        {/* Filters + Create Button */}
        <div className="flex flex-wrap items-center gap-4">
          {tab === 'ROOM_SCHEDULE' && (
            <select
              value={filterRoomId}
              onChange={e => setFilterRoomId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as salas</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name} {r.code ? `(${r.code})` : ''}</option>)}
            </select>
          )}
          {tab === 'TEACHER_SCHEDULE' && (isAdmin || isTechnician) && (
            <select
              value={filterUserId}
              onChange={e => setFilterUserId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos os professores</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          )}
          <div className="flex-1" />
          {canCreate && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Novo Horário
            </button>
          )}
        </div>

        {/* Available Rooms Now */}
        {showAvailability && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Salas Livres Agora</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => {
                const roomSchedules = schedules.filter(s => s.type === 'ROOM_SCHEDULE' && s.roomId === room.id && s.day === currentDay);
                const isOccupied = roomSchedules.some(s => currentTime >= s.startTime && currentTime < s.endTime);
                if (isOccupied) return null;
                const nextSchedule = roomSchedules.filter(s => s.startTime > currentTime).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

                return (
                  <div key={room.id} className="card p-4 border-2 border-green-200 bg-green-50">
                    <h3 className="font-semibold text-gray-900">{room.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{room.building} {room.code ? `• ${room.code}` : ''}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium text-green-700">Disponível</span>
                    </div>
                    {nextSchedule && (
                      <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        Próxima aula: {nextSchedule.startTime} - {nextSchedule.endTime}
                        {nextSchedule.subject && ` (${nextSchedule.subject})`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Schedule Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Horário Semanal</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 p-3 font-semibold text-gray-700 w-32">Horário</th>
                  {days.map(day => (
                    <th key={day} className={`border border-gray-300 p-3 font-semibold text-center min-w-[160px] ${day === currentDay ? 'bg-blue-100 text-blue-800' : 'bg-gray-50 text-gray-700'}`}>
                      {dayLabels[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIndex) => {
                  const [slotStart, slotEnd] = slot.split(' - ');
                  return (
                    <tr key={slot} className={slotIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-3 text-center font-medium text-gray-600 bg-gray-50">{slot}</td>
                      {days.map(day => {
                        if (getCoveredBy(day, slotIndex)) return null;
                        const key = `${day}-${slotIndex}`;
                        const cellData = scheduleMap.get(key);
                        const isNow = isCurrentSlot(day, slotStart, slotEnd);

                        if (cellData) {
                          const { schedule, startSlot, endSlot } = cellData;
                          const rowSpan = endSlot - startSlot + 1;
                          const labels = getScheduleLabel(schedule);
                          const editable = canEditSchedule(schedule);

                          return (
                            <td key={`${day}-${slot}`} rowSpan={rowSpan}
                              className={`border border-gray-300 p-3 align-top relative group ${isNow ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-indigo-50'}`}>
                              <div className="space-y-1">
                                <div className="font-bold text-indigo-900 text-sm leading-tight">{labels.primary}</div>
                                <div className="text-sm text-indigo-800 font-medium">{labels.secondary}</div>
                                {labels.tertiary && <div className="text-xs text-indigo-600">{labels.tertiary}</div>}
                                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-indigo-200">
                                  {schedule.startTime.substring(0, 5)} - {schedule.endTime.substring(0, 5)}
                                </div>
                              </div>
                              {editable && (
                                <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                                  <button onClick={() => openEdit(schedule)} className="p-1 bg-white rounded shadow hover:bg-gray-100" title="Editar">
                                    <Pencil className="w-3 h-3 text-gray-600" />
                                  </button>
                                  <button onClick={() => handleDelete(schedule.id)} className="p-1 bg-white rounded shadow hover:bg-red-50" title="Eliminar">
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        }

                        return (
                          <td key={`${day}-${slot}`} className={`border border-gray-300 p-2 min-h-[80px] ${isNow ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''}`}>
                            <div className="h-full min-h-[60px] flex items-center justify-center">
                              <span className="text-gray-300 text-xs">&mdash;</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-50 border border-gray-300 rounded" />
            <span>Aula agendada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded" />
            <span>Horário atual</span>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Editar Horário' : 'Novo Horário'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Room or Teacher selector */}
              {form.type === 'ROOM_SCHEDULE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sala</label>
                  <select
                    value={form.roomId || ''}
                    onChange={e => setForm({ ...form, roomId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecionar sala...</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} {r.code ? `(${r.code})` : ''}</option>)}
                  </select>
                </div>
              )}

              {form.type === 'TEACHER_SCHEDULE' && isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
                  <select
                    value={form.userId || ''}
                    onChange={e => setForm({ ...form, userId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecionar professor...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                </div>
              )}

              {form.type === 'TEACHER_SCHEDULE' && isTeacher && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  Professor: <span className="font-medium">{currentUser?.firstName} {currentUser?.lastName}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label>
                <select
                  value={form.day}
                  onChange={e => setForm({ ...form, day: e.target.value as DayOfWeek })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {days.map(d => <option key={d} value={d}>{dayLabels[d]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                  <input
                    type="time" value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                  <input
                    type="time" value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                <input
                  type="text" value={form.subject || ''} placeholder="Ex: Matemática"
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {form.type === 'ROOM_SCHEDULE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professor (texto livre)</label>
                  <input
                    type="text" value={form.teacher || ''} placeholder="Nome do professor"
                    onChange={e => setForm({ ...form, teacher: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  {editingId ? 'Guardar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
