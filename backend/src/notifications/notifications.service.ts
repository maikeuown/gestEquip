import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { isRead: false }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async create(data: { userId: string; institutionId: string; type: NotificationType; title: string; message: string; data?: object; link?: string }) {
    return this.prisma.notification.create({ data: { ...data, data: data.data as any } });
  }

  async createForInstitution(institutionId: string, data: { type: NotificationType; title: string; message: string; link?: string }) {
    const users = await this.prisma.user.findMany({ where: { institutionId, isActive: true, deletedAt: null }, select: { id: true } });
    return this.prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, institutionId, ...data })),
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(id: string, userId: string) {
    await this.prisma.notification.deleteMany({ where: { id, userId } });
    return { message: 'Notificação eliminada' };
  }
}
