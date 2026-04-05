import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('presence')
@UseGuards(JwtAuthGuard)
export class PresenceController {
  constructor(private presenceService: PresenceService) {}

  @Post('heartbeat')
  async heartbeat(@Req() req: any) {
    await this.presenceService.heartbeat(req.user.id);
    return { success: true };
  }

  @Get('online')
  async getOnline(@Req() req: any) {
    const peers = await this.presenceService.getOnlinePeers(
      req.user.id,
      req.user.institutionId,
    );
    return { success: true, data: peers };
  }
}
