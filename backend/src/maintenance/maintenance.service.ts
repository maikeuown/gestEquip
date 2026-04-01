import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceDto, UpdateMaintenanceDto } from './dto/create-maintenance.dto';
import { MaintenanceStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

const ticketInclude = {
  equipment: { select: { id: true, name: true, brand: true, model: true, serialNumber: true } },
  reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  institution: { select: { id: true, name: true } },
  _count: { select: { logs: true, messages: true } },
};

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService, private events: EventEmitter2) {}

  async findAll(institutionId: string, filters?: { status?: MaintenanceStatus; assignedToId?: string; priority?: string; search?: string }) {
    const { status, assignedToId, priority, search } = filters || {};
    return this.prisma.maintenanceTicket.findMany({
      where: {
        institutionId,
        deletedAt: null,
        ...(status && { status }),
        ...(assignedToId && { assignedToId }),
        ...(priority && { priority: priority as any }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { ticketNumber: { contains: search, mode: 'insensitive' } },
            { equipment: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: ticketInclude,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.maintenanceTicket.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...ticketInclude,
        logs: { include: { user: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        messages: { include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: 'asc' } },
        attachments: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    return ticket;
  }

  async create(dto: CreateMaintenanceDto, institutionId: string, reportedById: string) {
    const count = await this.prisma.maintenanceTicket.count({ where: { institutionId } });
    const ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;
    const ticket = await this.prisma.maintenanceTicket.create({
      data: { ...dto, institutionId, reportedById, ticketNumber },
      include: ticketInclude,
    });
    this.events.emit('maintenance.created', ticket);
    return ticket;
  }

  async update(id: string, dto: UpdateMaintenanceDto, userId: string) {
    const ticket = await this.prisma.maintenanceTicket.findFirst({ where: { id, deletedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    const data: any = { ...dto };
    if (dto.status === MaintenanceStatus.RESOLVED || dto.status === MaintenanceStatus.CLOSED) {
      data.resolvedAt = new Date();
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.maintenanceTicket.update({ where: { id }, data, include: ticketInclude }),
      ...(dto.status && dto.status !== ticket.status ? [
        this.prisma.maintenanceLog.create({
          data: { ticketId: id, userId, action: `Status alterado para ${dto.status}`, oldStatus: ticket.status, newStatus: dto.status },
        }),
      ] : []),
    ]);
    this.events.emit('maintenance.updated', updated);
    return updated;
  }

  async remove(id: string) {
    const ticket = await this.prisma.maintenanceTicket.findFirst({ where: { id, deletedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    await this.prisma.maintenanceTicket.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Ticket eliminado com sucesso' };
  }

  async addMessage(ticketId: string, content: string, senderId: string) {
    const ticket = await this.prisma.maintenanceTicket.findFirst({ where: { id: ticketId, deletedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    const message = await this.prisma.message.create({
      data: { ticketId, content, senderId },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    this.events.emit('maintenance.message', { ticket, message });
    return message;
  }

  getStats(institutionId: string) {
    return Promise.all([
      this.prisma.maintenanceTicket.count({ where: { institutionId, deletedAt: null, status: MaintenanceStatus.OPEN } }),
      this.prisma.maintenanceTicket.count({ where: { institutionId, deletedAt: null, status: MaintenanceStatus.IN_PROGRESS } }),
      this.prisma.maintenanceTicket.count({ where: { institutionId, deletedAt: null, status: MaintenanceStatus.RESOLVED } }),
      this.prisma.maintenanceTicket.count({ where: { institutionId, deletedAt: null, status: MaintenanceStatus.WAITING_PARTS } }),
    ]).then(([open, inProgress, resolved, waitingParts]) => ({ open, inProgress, resolved, waitingParts }));
  }
}
