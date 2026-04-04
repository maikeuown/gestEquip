import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('users') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('institutionId') institutionId: string, @Query('role') role: UserRole, @CurrentUser() user: any) {
    const instId = user.role === UserRole.SUPER_ADMIN ? institutionId : user.institutionId;
    return this.usersService.findAll(instId, role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    if (user.role !== UserRole.SUPER_ADMIN) dto.institutionId = user.institutionId;
    return this.usersService.create(dto);
  }

  @Put(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.usersService.update(id, dto); }

  @Delete(':id') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.usersService.remove(id); }

  @Patch(':id/toggle-active') @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  toggleActive(@Param('id') id: string) { return this.usersService.toggleActive(id); }

  @ApiOperation({ summary: 'Self role confirmation — only when roleConfirmed is false' })
  @Patch('me/confirm-role')
  async confirmRoleSelf(
    @CurrentUser() user: any,
    @Body() dto: { role: UserRole; roleConfirmed: boolean; institutionId?: string },
  ) {
    if (!user) throw new ForbiddenException('Não autenticado');
    if (user.roleConfirmed) throw new BadRequestException('Função já foi confirmada');
    if (!dto.role || !['TEACHER', 'STAFF'].includes(dto.role)) {
      throw new BadRequestException('Função inválida. Apenas TEACHER ou STAFF são permitidos.');
    }
    return this.usersService.confirmRoleSelf(user.id, dto.role, dto.institutionId);
  }
}
