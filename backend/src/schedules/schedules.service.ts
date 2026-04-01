import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  findAll(institutionId: string) {
    return this.prisma.schedule.findMany({
      where: { institutionId },
      include: { room: true },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  findByRoom(roomId: string) {
    return this.prisma.schedule.findMany({
      where: { roomId },
      include: { room: true },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { room: true },
    });
    if (!schedule) throw new NotFoundException('Horario nao encontrado');
    return schedule;
  }

  create(dto: CreateScheduleDto & { institutionId: string }) {
    return this.prisma.schedule.create({ data: dto, include: { room: true } });
  }

  async update(id: string, dto: Partial<CreateScheduleDto>) {
    await this.findOne(id);
    return this.prisma.schedule.update({ where: { id }, data: dto, include: { room: true } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.schedule.delete({ where: { id } });
    return { message: 'Horario eliminado com sucesso' };
  }
}
