import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto, UpdateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestStatus, UserRole } from '@prisma/client';
import { IsString } from 'class-validator';

class AddMessageDto { @IsString() content: string; }

@ApiTags('requests') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly service: RequestsService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('status') status: RequestStatus, @Query('mine') mine: string) {
    const createdById = mine === 'true' ? user.id : undefined;
    return this.service.findAll(user.institutionId, { status, createdById });
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.institutionId, user.id);
  }

  @Put(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN)
  update(@Param('id') id: string, @Body() dto: UpdateRequestDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user.id);
  }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @Body() dto: AddMessageDto, @CurrentUser() user: any) {
    return this.service.addMessage(id, dto.content, user.id);
  }
}
