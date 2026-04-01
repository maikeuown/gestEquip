import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto, UpdateMaintenanceDto } from './dto/create-maintenance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MaintenanceStatus, UserRole } from '@prisma/client';
import { IsString } from 'class-validator';

class AddMessageDto { @IsString() content: string; }

@ApiTags('maintenance') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('status') status: MaintenanceStatus, @Query('assignedToId') assignedToId: string, @Query('priority') priority: string, @Query('search') search: string) {
    return this.service.findAll(user.institutionId, { status, assignedToId, priority, search });
  }

  @Get('stats') getStats(@CurrentUser() user: any) { return this.service.getStats(user.institutionId); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.id);
  }

  @Put(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN)
  update(@Param('id') id: string, @Body() dto: UpdateMaintenanceDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @Body() dto: AddMessageDto, @CurrentUser() user: any) {
    return this.service.addMessage(id, dto.content, user.id);
  }
}
