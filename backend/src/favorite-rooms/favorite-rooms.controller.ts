import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FavoriteRoomsService } from './favorite-rooms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('favorite-rooms') @ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorite-rooms')
export class FavoriteRoomsController {
  constructor(private readonly service: FavoriteRoomsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.id);
  }

  @Post(':roomId/toggle')
  toggle(@CurrentUser() user: any, @Param('roomId') roomId: string) {
    return this.service.toggle(user.id, roomId);
  }

  @Post()
  add(@CurrentUser() user: any, @Body() body: { roomId: string }) {
    return this.service.add(user.id, body.roomId);
  }

  @Delete(':roomId')
  remove(@CurrentUser() user: any, @Param('roomId') roomId: string) {
    return this.service.remove(user.id, roomId);
  }
}
