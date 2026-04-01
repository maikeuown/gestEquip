import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipmentStatus, MaintenanceStatus, MovementStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(institutionId: string) {
    const [
      totalEquipment, activeEquipment, maintenanceEquipment,
      openTickets, inProgressTickets, resolvedThisMonth,
      pendingMovements, totalUsers, activeUsers,
    ] = await Promise.all([
      this.prisma.equipment.count({ where: { institutionId, deletedAt: null } }),
      this.prisma.equipment.count({ where: { institutionId, deletedAt: null, status: EquipmentStatus.ACTIVE } }),
      this.prisma.equipment.count({ where: { institutionId, deletedAt: null, status: EquipmentStatus.MAINTENANCE } }),
      this.prisma.maintenanceTicket.count({ where: { institutionId, deletedAt: null, status: MaintenanceStatus.OPEN } }),
      this.prisma.maintenanceTicket.count({ where: { institutionId, deletedAt: null, status: MaintenanceStatus.IN_PROGRESS } }),
      this.prisma.maintenanceTicket.count({
        where: { institutionId, deletedAt: null, status: MaintenanceStatus.RESOLVED, resolvedAt: { gte: new Date(new Date().setDate(1)) } },
      }),
      this.prisma.movement.count({ where: { institutionId, status: MovementStatus.PENDING } }),
      this.prisma.user.count({ where: { institutionId, deletedAt: null } }),
      this.prisma.user.count({ where: { institutionId, deletedAt: null, isActive: true } }),
    ]);
    return { equipment: { total: totalEquipment, active: activeEquipment, maintenance: maintenanceEquipment }, tickets: { open: openTickets, inProgress: inProgressTickets, resolvedThisMonth }, movements: { pending: pendingMovements }, users: { total: totalUsers, active: activeUsers } };
  }

  async getEquipmentByType(institutionId: string) {
    const types = await this.prisma.equipmentType.findMany({
      where: { institutionId, deletedAt: null },
      include: { _count: { select: { equipment: true } } },
    });
    return types.map(t => ({ name: t.name, count: t._count.equipment }));
  }

  async getEquipmentByStatus(institutionId: string) {
    const statuses = Object.values(EquipmentStatus);
    const counts = await Promise.all(statuses.map(s => this.prisma.equipment.count({ where: { institutionId, deletedAt: null, status: s } })));
    return statuses.map((s, i) => ({ status: s, count: counts[i] }));
  }

  async getMaintenanceTrend(institutionId: string, months = 6) {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = await this.prisma.maintenanceTicket.count({
        where: { institutionId, createdAt: { gte: start, lte: end }, deletedAt: null },
      });
      result.push({ month: start.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' }), count });
    }
    return result;
  }

  async getEquipmentByRoom(institutionId: string) {
    const rooms = await this.prisma.room.findMany({
      where: { institutionId, deletedAt: null },
      include: { _count: { select: { equipment: true } } },
    });
    return rooms.map(r => ({ name: r.name, count: r._count.equipment })).filter(r => r.count > 0);
  }

  async getRecentActivity(institutionId: string) {
    const [tickets, movements] = await Promise.all([
      this.prisma.maintenanceTicket.findMany({
        where: { institutionId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { equipment: { select: { name: true } }, reportedBy: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.movement.findMany({
        where: { institutionId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { equipment: { select: { name: true } }, requestedBy: { select: { firstName: true, lastName: true } } },
      }),
    ]);
    return { recentTickets: tickets, recentMovements: movements };
  }
}
