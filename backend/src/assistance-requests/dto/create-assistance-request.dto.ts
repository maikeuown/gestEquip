import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AssistanceProblem } from '@prisma/client';

export class CreateAssistanceRequestDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsEnum(AssistanceProblem) problemType: AssistanceProblem;
  @IsString() roomId: string;
  @IsOptional() @IsString() equipmentId?: string;
}
