import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto, UpdateRequestDto } from './dto/create-request.dto';
import { RequestStatus } from '@prisma/client';

const reqInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  findAll(institutionId: string, filters?: { status?: RequestStatus; createdById?: string }) {
    return this.prisma.request.findMany({
      where: { institutionId, ...(filters?.status && { status: filters.status }), ...(filters?.createdById && { createdById: filters.createdById }) },
      include: reqInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const req = await this.prisma.request.findFirst({
      where: { id },
      include: { ...reqInclude, messages: { include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!req) throw new NotFoundException('Pedido não encontrado');
    return req;
  }

  create(dto: CreateRequestDto, institutionId: string, createdById: string) {
    return this.prisma.request.create({ data: { ...dto, institutionId, createdById }, include: reqInclude });
  }

  async update(id: string, dto: UpdateRequestDto, userId: string) {
    const req = await this.prisma.request.findFirst({ where: { id } });
    if (!req) throw new NotFoundException('Pedido não encontrado');
    const data: any = { ...dto };
    if (dto.status === RequestStatus.APPROVED || dto.status === RequestStatus.REJECTED) {
      data.approvedById = userId;
    }
    if (dto.status === RequestStatus.COMPLETED) data.completedAt = new Date();
    return this.prisma.request.update({ where: { id }, data, include: reqInclude });
  }

  async addMessage(requestId: string, content: string, senderId: string) {
    const req = await this.prisma.request.findFirst({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Pedido não encontrado');
    return this.prisma.message.create({
      data: { requestId, content, senderId },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
  }
}
