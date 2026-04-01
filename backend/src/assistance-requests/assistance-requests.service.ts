import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssistanceRequestDto } from './dto/create-assistance-request.dto';

@Injectable()
export class AssistanceRequestsService {
  constructor(private prisma: PrismaService) {}

  findAll(institutionId: string, userId?: string) {
    return this.prisma.assistanceRequest.findMany({
      where: {
        institutionId,
        ...(userId ? { createdById: userId } : {}),
      },
      include: {
        room: true,
        equipment: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.assistanceRequest.findUnique({
      where: { id },
      include: {
        room: true,
        equipment: { include: { equipmentType: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!request) throw new NotFoundException('Pedido de assistencia nao encontrado');
    return request;
  }

  create(dto: CreateAssistanceRequestDto & { institutionId: string; createdById: string }) {
    return this.prisma.assistanceRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        problemType: dto.problemType,
        status: 'PENDING',
        institution: { connect: { id: dto.institutionId } },
        room: { connect: { id: dto.roomId } },
        createdBy: { connect: { id: dto.createdById } },
        ...(dto.equipmentId ? { equipment: { connect: { id: dto.equipmentId } } } : {}),
      },
      include: {
        room: true,
        equipment: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async update(id: string, dto: Partial<CreateAssistanceRequestDto>) {
    await this.findOne(id);
    return this.prisma.assistanceRequest.update({
      where: { id },
      data: dto,
      include: { room: true, equipment: true },
    });
  }

  getEquipmentByRoom(roomId: string) {
    return this.prisma.equipment.findMany({
      where: { roomId, deletedAt: null, isActive: true },
      include: { equipmentType: true },
      orderBy: { name: 'asc' },
    });
  }
}
