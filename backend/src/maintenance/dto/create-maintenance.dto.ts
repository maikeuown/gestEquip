import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

export class CreateMaintenanceDto {
  @ApiProperty() @IsString() @IsNotEmpty() equipmentId: string;
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPreventive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateMaintenanceDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenanceStatus) status?: MaintenanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() actualCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
