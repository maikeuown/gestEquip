import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MovementsService } from './movements.service';
import { CreateMovementDto, UpdateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MovementStatus, UserRole } from '@prisma/client';

@ApiTags('movements') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly service: MovementsService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('status') status: MovementStatus, @Query('equipmentId') equipmentId: string) {
    return this.service.findAll(user.institutionId, { status, equipmentId });
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateMovementDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.id);
  }

  @Put(':id/status') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMovementDto, @CurrentUser() user: any) {
    return this.service.updateStatus(id, dto.status!, user.id, dto.notes);
  }
}
