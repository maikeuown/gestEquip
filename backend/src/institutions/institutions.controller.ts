import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('institutions') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll(@CurrentUser() user: any) {
    return user.role === UserRole.SUPER_ADMIN
      ? this.institutionsService.findAll()
      : this.institutionsService.findOne(user.institutionId);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.institutionsService.findOne(id); }

  @Post() @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateInstitutionDto) { return this.institutionsService.create(dto); }

  @Put(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) { return this.institutionsService.update(id, dto); }

  @Delete(':id') @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) { return this.institutionsService.remove(id); }

  @Get(':id/stats')
  getStats(@Param('id') id: string) { return this.institutionsService.getStats(id); }
}
