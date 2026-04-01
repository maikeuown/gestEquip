import { Controller, Get, Put, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications') @ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get() findAll(@CurrentUser('id') userId: string, @Query('unread') unread: string) {
    return this.service.findAll(userId, unread === 'true');
  }

  @Get('unread-count') getCount(@CurrentUser('id') userId: string) {
    return this.service.getUnreadCount(userId).then(count => ({ count }));
  }

  @Put(':id/read') markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.markRead(id, userId);
  }

  @Put('read-all') markAllRead(@CurrentUser('id') userId: string) {
    return this.service.markAllRead(userId);
  }

  @Delete(':id') delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }
}
