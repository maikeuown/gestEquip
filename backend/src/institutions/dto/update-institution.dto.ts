import { PartialType } from '@nestjs/swagger';
import { CreateInstitutionDto } from './create-institution.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateInstitutionDto extends PartialType(CreateInstitutionDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
