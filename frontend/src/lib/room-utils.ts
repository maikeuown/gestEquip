import type { Schedule } from '@/types';

export function isRoomAvailable(schedules: Schedule[], roomId: string): boolean {
  const now = new Date();
  const currentDay = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const roomSchedules = schedules.filter(s => s.roomId === roomId && s.day === currentDay);

  if (roomSchedules.length === 0) return true;

  return !roomSchedules.some(s => {
    const start = s.startTime;
    const end = s.endTime;
    return currentTime >= start && currentTime < end;
  });
}

export function getRoomStatus(schedules: Schedule[], roomId: string): { available: boolean; nextClass?: { startTime: string; endTime: string } } {
  const now = new Date();
  const currentDay = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const roomSchedules = schedules.filter(s => s.roomId === roomId && s.day === currentDay).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const currentClass = roomSchedules.find(s => currentTime >= s.startTime && currentTime < s.endTime);
  if (currentClass) {
    return { available: false, nextClass: { startTime: currentClass.startTime, endTime: currentClass.endTime } };
  }

  const nextClass = roomSchedules.find(s => s.startTime > currentTime);
  return { available: true, nextClass };
}
