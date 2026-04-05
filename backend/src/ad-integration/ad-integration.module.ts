import { Module } from '@nestjs/common';
import { AdIntegrationController } from './ad-integration.controller';
import { AdIntegrationService } from './ad-integration.service';
import { EncryptionService } from './encryption.service';

@Module({
  controllers: [AdIntegrationController],
  providers: [AdIntegrationService, EncryptionService],
  exports: [AdIntegrationService],
})
export class AdIntegrationModule {}
