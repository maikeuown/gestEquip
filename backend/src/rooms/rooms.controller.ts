import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('rooms') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Get() findAll(@CurrentUser() user: any) { return this.service.findAll(user.institutionId); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN)
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: any) {
    dto.institutionId = user.role === UserRole.SUPER_ADMIN ? dto.institutionId : user.institutionId;
    return this.service.create(dto);
  }

  @Put(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoomDto>) { return this.service.update(id, dto); }

  @Delete(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TECHNICIAN)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
