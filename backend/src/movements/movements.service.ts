import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto, UpdateMovementDto } from './dto/create-movement.dto';
import { MovementStatus, EquipmentStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

const movementInclude = {
  equipment: { select: { id: true, name: true, brand: true, model: true, serialNumber: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  fromRoom: true,
  toRoom: true,
};

@Injectable()
export class MovementsService {
  constructor(private prisma: PrismaService, private events: EventEmitter2) {}

  findAll(institutionId: string, filters?: { status?: MovementStatus; equipmentId?: string }) {
    const { status, equipmentId } = filters || {};
    return this.prisma.movement.findMany({
      where: { institutionId, ...(status && { status }), ...(equipmentId && { equipmentId }) },
      include: movementInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const m = await this.prisma.movement.findFirst({ where: { id }, include: movementInclude });
    if (!m) throw new NotFoundException('Movimento não encontrado');
    return m;
  }

  async create(dto: CreateMovementDto, institutionId: string, requestedById: string) {
    const equipment = await this.prisma.equipment.findFirst({ where: { id: dto.equipmentId, deletedAt: null } });
    if (!equipment) throw new NotFoundException('Equipamento não encontrado');
    const movement = await this.prisma.movement.create({
      data: { ...dto, institutionId, requestedById, fromRoomId: dto.fromRoomId || equipment.roomId },
      include: movementInclude,
    });
    this.events.emit('movement.created', movement);
    return movement;
  }

  async updateStatus(id: string, status: MovementStatus, approvedById: string, notes?: string) {
    const movement = await this.prisma.movement.findFirst({ where: { id } });
    if (!movement) throw new NotFoundException('Movimento não encontrado');

    const data: any = { status, notes };
    if (status === MovementStatus.APPROVED) data.approvedById = approvedById;
    if (status === MovementStatus.COMPLETED) {
      data.completedAt = new Date();
      // Update equipment room if there's a destination
      if (movement.toRoomId) {
        await this.prisma.equipment.update({
          where: { id: movement.equipmentId },
          data: { roomId: movement.toRoomId },
        });
      }
    }

    const updated = await this.prisma.movement.update({ where: { id }, data, include: movementInclude });
    this.events.emit('movement.updated', updated);
    return updated;
  }
}
