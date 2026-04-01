import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@Injectable()
export class InstitutionsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.institution.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { users: true, equipment: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const inst = await this.prisma.institution.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { users: true, equipment: true, rooms: true } } },
    });
    if (!inst) throw new NotFoundException('Instituição não encontrada');
    return inst;
  }

  create(dto: CreateInstitutionDto) {
    return this.prisma.institution.create({ data: dto });
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    const inst = await this.prisma.institution.findFirst({ where: { id, deletedAt: null } });
    if (!inst) throw new NotFoundException('Instituição não encontrada');
    return this.prisma.institution.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const inst = await this.prisma.institution.findFirst({ where: { id, deletedAt: null } });
    if (!inst) throw new NotFoundException('Instituição não encontrada');
    await this.prisma.institution.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Instituição eliminada com sucesso' };
  }

  getStats(id: string) {
    return this.prisma.institution.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: true, equipment: true, rooms: true, maintenanceTickets: true, movements: true } },
      },
    });
  }
}
