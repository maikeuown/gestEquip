import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  findByTicket(ticketId: string) {
    return this.prisma.message.findMany({
      where: { ticketId },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findByRequest(requestId: string) {
    return this.prisma.message.findMany({
      where: { requestId },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: { content: string; senderId: string; ticketId?: string; requestId?: string }) {
    return this.prisma.message.create({
      data,
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
  }
}
