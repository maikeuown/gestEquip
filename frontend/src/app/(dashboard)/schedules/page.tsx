'use client';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import { schedulesApi, roomsApi } from '@/lib/api';
import type { Schedule, Room } from '@/types';
import toast from 'react-hot-toast';

const dayLabels: Record<string, string> = {
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
};

const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;

// Define your time slots (adjust as needed)
const timeSlots = [
  '07:30 - 08:30',
  '08:30 - 09:30',
  '09:30 - 10:30',
  '10:30 - 11:30',
  '11:30 - 12:30',
  '12:30 - 13:30',
  '13:30 - 14:30',
  '14:30 - 15:30',
  '15:30 - 16:30',
  '16:30 - 17:30',
  '17:30 - 18:30',
  '18:30 - 19:30',
  '19:30 - 20:30',
  '20:30 - 21:30',
];

// Helper to parse time string to minutes for comparison
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [schedulesData, roomsData] = await Promise.all([
          schedulesApi.list(),
          roomsApi.list(),
        ]);
        setSchedules(schedulesData);
        const roomMap = new Map(roomsData.map((r: Room) => [r.id, r]));
        setRooms(roomMap);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar horários');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" /></div>;

  const now = new Date();
  const currentDay = days[now.getDay() as any] || 'MONDAY';
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Build a map of which slots are covered by which schedule (for rowspan)
  const getScheduleMap = () => {
    const map = new Map<string, { schedule: Schedule; room: Room | undefined; startSlot: number; endSlot: number }>();
    
    days.forEach(day => {
      const daySchedules = schedules.filter(s => s.day === day);
      
      daySchedules.forEach(schedule => {
        const room = rooms.get(schedule.roomId);
        const scheduleStart = timeToMinutes(schedule.startTime);
        const scheduleEnd = timeToMinutes(schedule.endTime);
        
        // Find which slots this schedule covers
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
          // Store by first slot index only (others will be marked as covered)
          const key = `${day}-${startSlot}`;
          map.set(key, { schedule, room, startSlot, endSlot });
        }
      });
    });
    
    return map;
  };

  const scheduleMap = getScheduleMap();

  // Check if a slot is covered by a schedule that started earlier
  const getCoveredBy = (day: string, slotIndex: number) => {
    for (const [key, value] of scheduleMap) {
      if (key.startsWith(day) && slotIndex > value.startSlot && slotIndex <= value.endSlot) {
        return true;
      }
    }
    return false;
  };

  // Check if current time is within a slot
  const isCurrentSlot = (day: string, slotStart: string, slotEnd: string) => {
    if (day !== currentDay) return false;
    const nowMin = timeToMinutes(currentTime);
    const startMin = timeToMinutes(slotStart);
    const endMin = timeToMinutes(slotEnd);
    return nowMin >= startMin && nowMin < endMin;
  };

  return (
    <div>
      <Header title="Horários - Salas Disponíveis" />
      <div className="p-6 space-y-6">
        {/* Current Time Display */}
        <div className="card p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700 font-medium">Horário Atual</p>
              <p className="text-lg font-bold text-blue-900">{currentTime} • {dayLabels[currentDay]}</p>
            </div>
          </div>
        </div>

        {/* Available Rooms Now */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Salas Livres Agora</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(rooms.values()).map(room => {
              const roomSchedules = schedules.filter(s => s.roomId === room.id && s.day === currentDay);
              const isOccupied = roomSchedules.some(s => currentTime >= s.startTime && currentTime < s.endTime);

              if (isOccupied) return null;

              const nextSchedule = roomSchedules
                .filter(s => s.startTime > currentTime)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

              return (
                <div key={room.id} className="card p-4 border-2 border-green-200 bg-green-50">
                  <h3 className="font-semibold text-gray-900">{room.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{room.building} • {room.code}</p>

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

        {/* Weekly Schedule Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Horário Semanal</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 p-3 font-semibold text-gray-700 w-32">
                    Horário
                  </th>
                  {days.map(day => (
                    <th 
                      key={day} 
                      className={`border border-gray-300 p-3 font-semibold text-center min-w-[160px] ${
                        day === currentDay ? 'bg-blue-100 text-blue-800' : 'bg-gray-50 text-gray-700'
                      }`}
                    >
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
                      <td className="border border-gray-300 p-3 text-center font-medium text-gray-600 bg-gray-50">
                        {slot}
                      </td>
                      {days.map(day => {
                        const isCovered = getCoveredBy(day, slotIndex);
                        if (isCovered) return null; // Skip covered cells
                        
                        const key = `${day}-${slotIndex}`;
                        const cellData = scheduleMap.get(key);
                        const isNow = isCurrentSlot(day, slotStart, slotEnd);
                        
                        if (cellData) {
                          const { schedule, room, startSlot, endSlot } = cellData;
                          const rowSpan = endSlot - startSlot + 1;
                          
                          return (
                            <td 
                              key={`${day}-${slot}`}
                              rowSpan={rowSpan}
                              className={`border border-gray-300 p-3 align-top ${
                                isNow ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-indigo-50'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="font-bold text-indigo-900 text-sm leading-tight">
                                  {schedule.subject || 'Aula'}
                                </div>
                                <div className="text-sm text-indigo-800 font-medium">
                                  {room?.name || 'Sala não encontrada'}
                                </div>
                                <div className="text-xs text-indigo-600">
                                  {room?.building}
                                </div>
                                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-indigo-200">
                                  {schedule.startTime.substring(0, 5)} - {schedule.endTime.substring(0, 5)}
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        // Empty cell
                        return (
                          <td 
                            key={`${day}-${slot}`}
                            className={`border border-gray-300 p-2 min-h-[80px] ${
                              isNow ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''
                            }`}
                          >
                            <div className="h-full min-h-[60px] flex items-center justify-center">
                              <span className="text-gray-300 text-xs">—</span>
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
            <div className="w-4 h-4 bg-indigo-50 border border-gray-300 rounded"></div>
            <span>Aula agendada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
            <span>Horário atual</span>
          </div>
        </div>
      </div>
    </div>
  );
}