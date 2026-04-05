import { IsString, IsBoolean, IsOptional, IsArray, IsInt, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdConfigDto {
  @ApiProperty({ example: 'dc.escola.local' })
  @IsString()
  @IsNotEmpty()
  domainController!: string;

  @ApiPropertyOptional({ example: 636 })
  @IsInt()
  @Min(1)
  port?: number;

  @ApiProperty({ example: 'DC=escola,DC=local' })
  @IsString()
  @IsNotEmpty()
  baseDn!: string;

  @ApiProperty({ example: 'CN=svc-gestequip,OU=Service Accounts,DC=escola,DC=local' })
  @IsString()
  @IsNotEmpty()
  bindDn!: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  bindPassword!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  useLdaps!: boolean;

  @ApiProperty({ example: ['CN=Professores,OU=Groups,DC=escola,DC=local'] })
  @IsArray()
  @IsString({ each: true })
  teacherGroupDns!: string[];

  @ApiPropertyOptional({ example: '(&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))' })
  @IsOptional()
  @IsString()
  userFilter?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}

export class AdTestConnectionDto {
  @ApiProperty({ example: 'dc.escola.local' })
  @IsString()
  @IsNotEmpty()
  domainController!: string;

  @ApiPropertyOptional({ example: 636 })
  @IsInt()
  @Min(1)
  port?: number;

  @ApiProperty({ example: 'DC=escola,DC=local' })
  @IsString()
  @IsNotEmpty()
  baseDn!: string;

  @ApiProperty({ example: 'CN=svc-gestequip,OU=Service Accounts,DC=escola,DC=local' })
  @IsString()
  @IsNotEmpty()
  bindDn!: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  bindPassword!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  useLdaps!: boolean;
}

export class AdSyncDto {
  @ApiPropertyOptional({ example: 'full', enum: ['full', 'incremental'] })
  @IsOptional()
  @IsString()
  type?: string;
}
