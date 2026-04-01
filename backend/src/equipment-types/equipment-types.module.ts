import { Module } from '@nestjs/common';
import { EquipmentTypesService } from './equipment-types.service';
import { EquipmentTypesController } from './equipment-types.controller';

@Module({
  controllers: [EquipmentTypesController],
  providers: [EquipmentTypesService],
  exports: [EquipmentTypesService],
})
export class EquipmentTypesModule {}
