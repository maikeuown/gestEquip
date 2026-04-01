import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentTypeDto } from './dto/create-equipment-type.dto';

@Injectable()
export class EquipmentTypesService {
  constructor(private prisma: PrismaService) {}

  findAll(institutionId: string) {
    return this.prisma.equipmentType.findMany({
      where: { institutionId, deletedAt: null, isActive: true },
      include: { _count: { select: { equipment: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const type = await this.prisma.equipmentType.findFirst({ where: { id, deletedAt: null } });
    if (!type) throw new NotFoundException('Tipo de equipamento não encontrado');
    return type;
  }

  create(dto: CreateEquipmentTypeDto) {
    return this.prisma.equipmentType.create({ data: dto as CreateEquipmentTypeDto & { institutionId: string } });
  }

  async update(id: string, dto: Partial<CreateEquipmentTypeDto>) {
    const type = await this.prisma.equipmentType.findFirst({ where: { id, deletedAt: null } });
    if (!type) throw new NotFoundException('Tipo de equipamento não encontrado');
    return this.prisma.equipmentType.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const type = await this.prisma.equipmentType.findFirst({ where: { id, deletedAt: null } });
    if (!type) throw new NotFoundException('Tipo de equipamento não encontrado');
    await this.prisma.equipmentType.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Tipo eliminado com sucesso' };
  }
}
