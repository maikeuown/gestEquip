import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentStatus } from '@prisma/client';

export class CreateEquipmentDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() equipmentTypeId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roomId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() inventoryNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(EquipmentStatus) status?: EquipmentStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() acquisitionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() acquisitionCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() specifications?: object;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
