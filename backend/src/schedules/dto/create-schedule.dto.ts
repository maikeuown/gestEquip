import { IsString, IsOptional, IsEnum, ValidateIf } from 'class-validator';
import { DayOfWeek, ScheduleType } from '@prisma/client';

export class CreateScheduleDto {
  @IsOptional() @IsString() institutionId?: string;

  @IsEnum(ScheduleType) type: ScheduleType;

  @ValidateIf((o) => o.type === ScheduleType.ROOM_SCHEDULE)
  @IsString()
  roomId?: string;

  @ValidateIf((o) => o.type === ScheduleType.TEACHER_SCHEDULE)
  @IsString()
  userId?: string;

  @IsEnum(DayOfWeek) day: DayOfWeek;
  @IsString() startTime: string;
  @IsString() endTime: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() teacher?: string;
}
