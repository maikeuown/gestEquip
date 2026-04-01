import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EquipmentTypesService } from './equipment-types.service';
import { CreateEquipmentTypeDto } from './dto/create-equipment-type.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('equipment-types') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment-types')
export class EquipmentTypesController {
  constructor(private readonly service: EquipmentTypesService) {}

  @Get()
  findAll(@CurrentUser() user: any) { return this.service.findAll(user.institutionId); }

  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateEquipmentTypeDto, @CurrentUser() user: any) {
    dto.institutionId = user.role === UserRole.SUPER_ADMIN ? dto.institutionId : user.institutionId;
    return this.service.create(dto);
  }

  @Put(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateEquipmentTypeDto>) { return this.service.update(id, dto); }

  @Delete(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
