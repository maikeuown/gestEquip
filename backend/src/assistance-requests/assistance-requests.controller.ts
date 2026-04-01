import { Controller, Get, Post, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssistanceRequestsService } from './assistance-requests.service';
import { CreateAssistanceRequestDto } from './dto/create-assistance-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('assistance-requests') @ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assistance-requests')
export class AssistanceRequestsController {
  constructor(private readonly service: AssistanceRequestsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    // Teachers see only their own; admins/technicians see all
    const userId = [UserRole.TEACHER, UserRole.STAFF].includes(user.role) ? user.id : undefined;
    return this.service.findAll(user.institutionId, userId);
  }

  @Get('room/:roomId/equipment')
  getEquipmentByRoom(@Param('roomId') roomId: string) {
    return this.service.getEquipmentByRoom(roomId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAssistanceRequestDto, @CurrentUser() user: any) {
    return this.service.create({
      ...dto,
      institutionId: user.institutionId,
      createdById: user.id,
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateAssistanceRequestDto>) {
    return this.service.update(id, dto);
  }
}
