import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType, MovementStatus } from '@prisma/client';

export class CreateMovementDto {
  @ApiProperty() @IsString() @IsNotEmpty() equipmentId: string;
  @ApiProperty() @IsEnum(MovementType) type: MovementType;
  @ApiPropertyOptional() @IsOptional() @IsString() fromRoomId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toRoomId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledDate?: string;
}

export class UpdateMovementDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(MovementStatus) status?: MovementStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
