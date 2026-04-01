import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('audit') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll(@CurrentUser() user: any, @Query('entity') entity: string, @Query('userId') userId: string, @Query('limit') limit: number) {
    return this.service.findAll(user.institutionId, { entity, userId, limit });
  }
}
