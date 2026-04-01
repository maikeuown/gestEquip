import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentStatus } from '@prisma/client';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const equipmentInclude = {
  equipmentType: true,
  room: true,
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  institution: { select: { id: true, name: true, shortName: true } },
  _count: { select: { maintenanceTickets: true, movements: true } },
};

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  findAll(institutionId: string, filters?: { status?: EquipmentStatus; roomId?: string; typeId?: string; search?: string }) {
    const { status, roomId, typeId, search } = filters || {};
    return this.prisma.equipment.findMany({
      where: {
        institutionId,
        deletedAt: null,
        ...(status && { status }),
        ...(roomId && { roomId }),
        ...(typeId && { equipmentTypeId: typeId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
            { serialNumber: { contains: search, mode: 'insensitive' } },
            { inventoryNumber: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: equipmentInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const eq = await this.prisma.equipment.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...equipmentInclude,
        maintenanceTickets: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { requestedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
        attachments: true,
      },
    });
    if (!eq) throw new NotFoundException('Equipamento não encontrado');
    return eq;
  }

  async findByQrCode(qrCode: string) {
    const eq = await this.prisma.equipment.findFirst({
      where: { qrCode, deletedAt: null },
      include: equipmentInclude,
    });
    if (!eq) throw new NotFoundException('Equipamento não encontrado');
    return eq;
  }

  async create(dto: CreateEquipmentDto, createdById: string) {
    const qrCode = uuidv4();
    return this.prisma.equipment.create({
      data: { ...dto, createdById, qrCode } as any,
      include: equipmentInclude,
    });
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    const eq = await this.prisma.equipment.findFirst({ where: { id, deletedAt: null } });
    if (!eq) throw new NotFoundException('Equipamento não encontrado');
    return this.prisma.equipment.update({ where: { id }, data: dto, include: equipmentInclude });
  }

  async remove(id: string) {
    const eq = await this.prisma.equipment.findFirst({ where: { id, deletedAt: null } });
    if (!eq) throw new NotFoundException('Equipamento não encontrado');
    await this.prisma.equipment.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Equipamento eliminado com sucesso' };
  }

  async generateQrCode(id: string): Promise<string> {
    const eq = await this.prisma.equipment.findFirst({ where: { id, deletedAt: null } });
    if (!eq) throw new NotFoundException('Equipamento não encontrado');
    const url = `${process.env.APP_URL || 'http://localhost:3001'}/equipment/${eq.qrCode}`;
    return QRCode.toDataURL(url, { width: 300, margin: 2 });
  }

  async getStats(institutionId: string) {
    const [total, active, maintenance, inactive, retired] = await Promise.all([
      this.prisma.equipment.count({ where: { institutionId, deletedAt: null } }),
      this.prisma.equipment.count({ where: { institutionId, deletedAt: null, status: EquipmentStatus.ACTIVE } }),
      this.prisma.equipment.count({ where: { institutionId, deletedAt: null, status: EquipmentStatus.MAINTENANCE } }),
      this.prisma.equipment.count({ where: { institutionId, deletedAt: null, status: EquipmentStatus.INACTIVE } }),
      this.prisma.equipment.count({ where: { institutionId, deletedAt: null, status: EquipmentStatus.RETIRED } }),
    ]);
    return { total, active, maintenance, inactive, retired };
  }

  async exportCsv(institutionId: string): Promise<string> {
    const items = await this.findAll(institutionId);
    const headers = ['ID', 'Nome', 'Tipo', 'Marca', 'Modelo', 'Nº Série', 'Nº Inventário', 'Estado', 'Sala', 'Atribuído a', 'Data Aquisição'];
    const rows = items.map(e => [
      e.id, e.name, (e.equipmentType as any)?.name || '', e.brand || '', e.model || '',
      e.serialNumber || '', e.inventoryNumber || '', e.status,
      (e.room as any)?.name || '',
      e.assignedTo ? `${(e.assignedTo as any).firstName} ${(e.assignedTo as any).lastName}` : '',
      e.acquisitionDate ? new Date(e.acquisitionDate).toISOString().split('T')[0] : '',
    ]);
    return [headers, ...rows].map(r => r.join(',')).join('\n');
  }
}
