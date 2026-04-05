import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AdIntegrationService } from './ad-integration.service';
import { AdConfigDto, AdTestConnectionDto, AdSyncDto } from './dto/ad-config.dto';

@ApiTags('ad-integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('ad')
export class AdIntegrationController {
  constructor(private readonly adService: AdIntegrationService) {}

  @ApiOperation({ summary: 'Get AD configuration for current institution' })
  @Get('config')
  async getConfig(@CurrentUser() user: any) {
    return this.adService.getConfig(user.institutionId);
  }

  @ApiOperation({ summary: 'Save/update AD configuration for current institution' })
  @Post('config')
  async saveConfig(@CurrentUser() user: any, @Body() dto: AdConfigDto) {
    if (!dto.domainController || !dto.baseDn || !dto.bindDn || !dto.bindPassword) {
      throw new BadRequestException('Campos obrigatórios em falta: domainController, baseDn, bindDn, bindPassword');
    }
    return this.adService.saveConfig(user.institutionId, dto);
  }

  @ApiOperation({ summary: 'Test AD connection with provided settings' })
  @Post('test-connection')
  async testConnection(@CurrentUser() user: any, @Body() dto: AdTestConnectionDto) {
    if (!dto.domainController || !dto.baseDn || !dto.bindDn || !dto.bindPassword) {
      throw new BadRequestException('Campos obrigatórios em falta para testar a ligação');
    }
    const result = await this.adService.testConnection({
      domainController: dto.domainController,
      port: dto.port || 636,
      baseDn: dto.baseDn,
      bindDn: dto.bindDn,
      bindPassword: dto.bindPassword,
      useLdaps: dto.useLdaps !== false,
    });
    return result;
  }

  @ApiOperation({ summary: 'Preview teachers from AD without importing (conflict detection)' })
  @Post('preview')
  async preview(@CurrentUser() user: any) {
    const config = await this.adService.getFullConfig(user.institutionId);
    if (!config) {
      throw new BadRequestException('Configuração AD não encontrada. Configure primeiro.');
    }
    if (!config.enabled) {
      throw new BadRequestException('Integração AD desativada. Ative primeiro.');
    }

    const { users: adUsers, errors } = await this.adService.queryTeachers({
      domainController: config.domainController,
      port: config.port,
      baseDn: config.baseDn,
      bindDn: config.bindDn,
      bindPassword: config.bindPassword,
      useLdaps: config.useLdaps,
      teacherGroupDns: config.teacherGroupDns as string[],
      userFilter: config.userFilter || undefined,
    });

    const preview = await this.adService.buildPreview(adUsers, user.institutionId);

    return {
      usersFound: adUsers.length,
      preview,
      errors,
    };
  }

  @ApiOperation({ summary: 'Sync teachers from AD to gestEquip' })
  @Post('sync')
  async sync(@CurrentUser() user: any, @Body() dto: AdSyncDto) {
    const config = await this.adService.getFullConfig(user.institutionId);
    if (!config) {
      throw new BadRequestException('Configuração AD não encontrada. Configure primeiro.');
    }
    if (!config.enabled) {
      throw new BadRequestException('Integração AD desativada. Ative primeiro.');
    }

    const startedAt = new Date();
    const operation = dto?.type === 'incremental' ? 'incremental' : 'full';

    try {
      const result = await this.adService.syncTeachers(
        {
          domainController: config.domainController,
          port: config.port,
          baseDn: config.baseDn,
          bindDn: config.bindDn,
          bindPassword: config.bindPassword,
          useLdaps: config.useLdaps,
          teacherGroupDns: config.teacherGroupDns as string[],
          userFilter: config.userFilter || undefined,
        },
        user.institutionId,
      );

      const status = result.usersFailed > 0 && result.usersCreated + result.usersUpdated === 0
        ? 'failed'
        : result.usersFailed > 0
          ? 'partial'
          : 'success';

      // Update config last sync info
      await this.prisma.schoolAdConfig.update({
        where: { institutionId: user.institutionId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: status,
          lastSyncUsersCount: result.usersCreated + result.usersUpdated,
          lastSyncErrors: result.errors,
        },
      });

      // Log the sync
      await this.adService.logSync(config.id, operation, status, startedAt, result);

      return {
        success: status !== 'failed',
        operation,
        status,
        usersFound: result.usersFound,
        usersCreated: result.usersCreated,
        usersUpdated: result.usersUpdated,
        usersSkipped: result.usersSkipped,
        usersFailed: result.usersFailed,
        errors: result.errors,
        message: this.getSyncMessage(status, result),
      };
    } catch (err: any) {
      const errorResult = {
        usersFound: 0,
        usersCreated: 0,
        usersUpdated: 0,
        usersSkipped: 0,
        usersFailed: 0,
        errors: [err.message || 'Erro desconhecido na sincronização'],
      };

      await this.prisma.schoolAdConfig.update({
        where: { institutionId: user.institutionId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'failed',
          lastSyncUsersCount: 0,
          lastSyncErrors: errorResult.errors,
        },
      });

      await this.adService.logSync(config.id, operation, 'failed', startedAt, errorResult);

      throw new InternalServerErrorException(`Falha na sincronização: ${err.message}`);
    }
  }

  @ApiOperation({ summary: 'Get sync status and history for current institution' })
  @Get('sync-status')
  async getSyncStatus(@CurrentUser() user: any) {
    const config = await this.adService.getConfig(user.institutionId);
    if (!config) {
      return { configured: false, message: 'Configuração AD não encontrada' };
    }
    return {
      configured: true,
      enabled: config.enabled,
      lastSyncAt: config.lastSyncAt,
      lastSyncStatus: config.lastSyncStatus,
      lastSyncUsersCount: config.lastSyncUsersCount,
      lastSyncErrors: config.lastSyncErrors,
      recentSyncs: config.syncLogs || [],
    };
  }

  // ── Helper ──

  private getSyncMessage(status: string, result: any): string {
    if (status === 'failed') {
      return 'Sincronização falhou. Verifique os erros e tente novamente.';
    }
    if (status === 'partial') {
      return `Sincronização parcial: ${result.usersCreated} criado(s), ${result.usersUpdated} atualizado(s), ${result.usersFailed} falha(s).`;
    }
    return `Sincronização concluída: ${result.usersCreated} professor(es) criado(s), ${result.usersUpdated} atualizado(s).`;
  }

  // Prisma inject — needed for config update in sync
  private get prisma() {
    return (this.adService as any).prisma;
  }
}
