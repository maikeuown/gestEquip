import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  findAll(institutionId: string) {
    return this.prisma.room.findMany({
      where: { institutionId, deletedAt: null },
      include: { _count: { select: { equipment: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { equipment: { where: { deletedAt: null }, include: { equipmentType: true } } },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return room;
  }

  create(dto: CreateRoomDto) { return this.prisma.room.create({ data: dto as CreateRoomDto & { institutionId: string } }); }

  async update(id: string, dto: Partial<CreateRoomDto>) {
    const room = await this.prisma.room.findFirst({ where: { id, deletedAt: null } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const room = await this.prisma.room.findFirst({ where: { id, deletedAt: null } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    await this.prisma.room.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Sala eliminada com sucesso' };
  }
}
