import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: { institutionId: string; userId?: string; action: string; entity: string; entityId?: string; oldValues?: object; newValues?: object; ipAddress?: string; userAgent?: string }) {
    return this.prisma.auditLog.create({ data: { ...data, oldValues: data.oldValues as any, newValues: data.newValues as any } });
  }

  findAll(institutionId: string, filters?: { entity?: string; userId?: string; limit?: number }) {
    return this.prisma.auditLog.findMany({
      where: { institutionId, ...(filters?.entity && { entity: filters.entity }), ...(filters?.userId && { userId: filters.userId }) },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }
}
