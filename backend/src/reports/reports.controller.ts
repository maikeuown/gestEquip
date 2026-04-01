import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reports') @ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard') dashboard(@CurrentUser() user: any) { return this.service.getDashboardStats(user.institutionId); }
  @Get('equipment-by-type') byType(@CurrentUser() user: any) { return this.service.getEquipmentByType(user.institutionId); }
  @Get('equipment-by-status') byStatus(@CurrentUser() user: any) { return this.service.getEquipmentByStatus(user.institutionId); }
  @Get('equipment-by-room') byRoom(@CurrentUser() user: any) { return this.service.getEquipmentByRoom(user.institutionId); }
  @Get('maintenance-trend') trend(@CurrentUser() user: any, @Query('months') months: number) { return this.service.getMaintenanceTrend(user.institutionId, months); }
  @Get('recent-activity') activity(@CurrentUser() user: any) { return this.service.getRecentActivity(user.institutionId); }
}
