import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('schedules') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.institutionId);
  }

  @Get('room/:roomId')
  findByRoom(@Param('roomId') roomId: string) {
    return this.service.findByRoom(roomId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: any) {
    const institutionId = user.role === UserRole.SUPER_ADMIN && dto.institutionId ? dto.institutionId : user.institutionId;
    return this.service.create({ ...dto, institutionId });
  }

  @Put(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateScheduleDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
