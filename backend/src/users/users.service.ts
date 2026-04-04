import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';

const userSelect = {
  id: true, email: true, firstName: true, lastName: true, phone: true,
  role: true, roleConfirmed: true, isActive: true, avatarUrl: true, lastLoginAt: true, createdAt: true, updatedAt: true,
  institution: { select: { id: true, name: true, shortName: true } },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(institutionId?: string, role?: UserRole) {
    return this.prisma.user.findMany({
      where: { deletedAt: null, ...(institutionId && { institutionId }), ...(role && { role }) },
      select: userSelect,
      orderBy: { firstName: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { ...userSelect, settings: true },
    });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email já está em uso');
    const passwordHash = await argon2.hash(dto.password);
    const { password, ...rest } = dto as any;
    return this.prisma.user.create({
      data: { ...rest, email: dto.email.toLowerCase(), passwordHash },
      select: userSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    const data: any = { ...dto };
    if (dto.password) { data.passwordHash = await argon2.hash(dto.password); delete data.password; }
    return this.prisma.user.update({ where: { id }, data, select: userSelect });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Utilizador eliminado com sucesso' };
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    const updated = await this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    return { isActive: updated.isActive };
  }
}
