import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DayOfWeek } from '@prisma/client';

export class CreateScheduleDto {
  @IsOptional() @IsString() institutionId?: string;
  @IsString() roomId: string;
  @IsEnum(DayOfWeek) day: DayOfWeek;
  @IsString() startTime: string;
  @IsString() endTime: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() teacher?: string;
}
