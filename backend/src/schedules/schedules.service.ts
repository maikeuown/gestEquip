import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleType } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  findAll(institutionId: string, type?: ScheduleType) {
    return this.prisma.schedule.findMany({
      where: { institutionId, ...(type && { type }) },
      include: { room: true, user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  findByRoom(roomId: string) {
    return this.prisma.schedule.findMany({
      where: { roomId, type: ScheduleType.ROOM_SCHEDULE },
      include: { room: true },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  findByUser(userId: string) {
    return this.prisma.schedule.findMany({
      where: { userId, type: ScheduleType.TEACHER_SCHEDULE },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { room: true, user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });
    if (!schedule) throw new NotFoundException('Horário não encontrado');
    return schedule;
  }

  async create(dto: CreateScheduleDto & { institutionId: string }) {
    await this.checkOverlap(dto);
    return this.prisma.schedule.create({
      data: {
        institutionId: dto.institutionId,
        type: dto.type,
        roomId: dto.type === ScheduleType.ROOM_SCHEDULE ? dto.roomId : null,
        userId: dto.type === ScheduleType.TEACHER_SCHEDULE ? dto.userId : null,
        day: dto.day,
        startTime: dto.startTime,
        endTime: dto.endTime,
        subject: dto.subject,
        teacher: dto.teacher,
      },
      include: { room: true, user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });
  }

  async update(id: string, dto: Partial<CreateScheduleDto>) {
    const existing = await this.findOne(id);
    const merged = { ...existing, ...dto };
    await this.checkOverlap(merged as any, id);
    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: { room: true, user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.schedule.delete({ where: { id } });
    return { message: 'Horário eliminado com sucesso' };
  }

  private async checkOverlap(
    dto: { type: ScheduleType; roomId?: string; userId?: string; day: string; startTime: string; endTime: string },
    excludeId?: string,
  ) {
    const where: any = {
      day: dto.day,
      ...(excludeId && { id: { not: excludeId } }),
    };

    if (dto.type === ScheduleType.ROOM_SCHEDULE && dto.roomId) {
      where.roomId = dto.roomId;
      where.type = ScheduleType.ROOM_SCHEDULE;
    } else if (dto.type === ScheduleType.TEACHER_SCHEDULE && dto.userId) {
      where.userId = dto.userId;
      where.type = ScheduleType.TEACHER_SCHEDULE;
    } else {
      return; // can't check overlap without target
    }

    const overlapping = await this.prisma.schedule.findFirst({
      where: {
        ...where,
        OR: [
          { startTime: { lt: dto.endTime }, endTime: { gt: dto.startTime } },
        ],
      },
    });

    if (overlapping) {
      const target = dto.type === ScheduleType.ROOM_SCHEDULE ? 'esta sala' : 'este professor';
      throw new ConflictException(`Já existe um horário sobreposto para ${target} neste dia e intervalo de tempo`);
    }
  }
}
