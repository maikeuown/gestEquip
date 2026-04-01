import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Res, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, EquipmentStatus } from '@prisma/client';

@ApiTags('equipment') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status: EquipmentStatus,
    @Query('roomId') roomId: string,
    @Query('typeId') typeId: string,
    @Query('search') search: string,
  ) { return this.service.findAll(user.institutionId, { status, roomId, typeId, search }); }

  @Get('stats')
  getStats(@CurrentUser() user: any) { return this.service.getStats(user.institutionId); }

  @Get('export/csv')
  async exportCsv(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.service.exportCsv(user.institutionId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="equipment.csv"');
    res.send(csv);
  }

  @Get('qr/:qrCode')
  findByQr(@Param('qrCode') qrCode: string) { return this.service.findByQrCode(qrCode); }

  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/qr')
  async getQrCode(@Param('id') id: string) {
    const dataUrl = await this.service.generateQrCode(id);
    return { qrCode: dataUrl };
  }

  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN)
  create(@Body() dto: CreateEquipmentDto, @CurrentUser() user: any) {
    if (user.role !== UserRole.SUPER_ADMIN) dto.institutionId = user.institutionId;
    return this.service.create(dto, user.id);
  }

  @Put(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN)
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) { return this.service.update(id, dto); }

  @Delete(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
