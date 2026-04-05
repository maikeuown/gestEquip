import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, ScheduleType } from '@prisma/client';

@ApiTags('schedules') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('type') type?: ScheduleType) {
    return this.service.findAll(user.institutionId, type);
  }

  @Get('room/:roomId')
  findByRoom(@Param('roomId') roomId: string) {
    return this.service.findByRoom(roomId);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    // Teachers can only see their own schedule; ADMIN/TECHNICIAN can see any
    if (user.role === UserRole.TEACHER && user.id !== userId) {
      throw new ForbiddenException('Só pode ver o seu próprio horário');
    }
    return this.service.findByUser(userId);
  }

  @Get('my')
  findMySchedule(@CurrentUser() user: any) {
    return this.service.findByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.TEACHER)
  async create(@Body() dto: CreateScheduleDto, @CurrentUser() user: any) {
    this.enforcePermissions(user, dto.type, dto.userId);
    const institutionId = user.role === UserRole.SUPER_ADMIN && dto.institutionId ? dto.institutionId : user.institutionId;
    return this.service.create({ ...dto, institutionId });
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.TEACHER)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateScheduleDto>, @CurrentUser() user: any) {
    const existing = await this.service.findOne(id);
    const effectiveType = dto.type ?? existing.type;
    const effectiveUserId = dto.userId ?? existing.userId;
    this.enforcePermissions(user, effectiveType, effectiveUserId);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.TEACHER)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const existing = await this.service.findOne(id);
    this.enforcePermissions(user, existing.type, existing.userId);
    return this.service.remove(id);
  }

  /**
   * Permission rules:
   * - ROOM_SCHEDULE: only ADMIN, SUPER_ADMIN, TECHNICIAN
   * - TEACHER_SCHEDULE: TEACHER can only edit their own; ADMIN/SUPER_ADMIN can edit any
   */
  private enforcePermissions(user: any, type: ScheduleType, targetUserId?: string | null) {
    const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role);

    if (type === ScheduleType.ROOM_SCHEDULE) {
      if (!isAdmin && user.role !== UserRole.TECHNICIAN) {
        throw new ForbiddenException('Apenas técnicos e administradores podem gerir horários de salas');
      }
    } else if (type === ScheduleType.TEACHER_SCHEDULE) {
      if (user.role === UserRole.TEACHER && user.id !== targetUserId) {
        throw new ForbiddenException('Professores só podem gerir o seu próprio horário');
      }
      if (user.role === UserRole.TECHNICIAN) {
        throw new ForbiddenException('Técnicos não podem gerir horários de professores');
      }
    }
  }
}
