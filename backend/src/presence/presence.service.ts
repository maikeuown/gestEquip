import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

const ONLINE_THRESHOLD_MS = 30_000; // 30 seconds

const ALLOWED_PEERS: Record<string, UserRole[]> = {
  TECHNICIAN: [UserRole.TEACHER, UserRole.STAFF],
  TEACHER: [UserRole.TECHNICIAN],
  STAFF: [UserRole.TECHNICIAN],
};

@Injectable()
export class PresenceService {
  constructor(private prisma: PrismaService) {}

  async heartbeat(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  }

  async getOnlinePeers(userId: string, institutionId: string) {
    const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return [];

    const allowedRoles = ALLOWED_PEERS[user.role];
    if (!allowedRoles) return [];

    const onlineUsers = await this.prisma.user.findMany({
      where: {
        institutionId,
        id: { not: userId },
        role: { in: allowedRoles },
        isActive: true,
        lastSeenAt: { gte: cutoff },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return onlineUsers.map((u) => ({
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      socketId: '',
    }));
  }
}
