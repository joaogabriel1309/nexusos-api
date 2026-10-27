import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { OmitType } from '@nestjs/swagger';
export class UserDto {
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(120) nome: string;
  @IsEmail() @MaxLength(160) email: string;
  @IsString() @MaxLength(120) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/) senha: string;
  @IsIn(['ADMIN','DESENVOLVEDOR']) perfil: 'ADMIN' | 'DESENVOLVEDOR';
}
export class UserUpdateDto extends OmitType(UserDto, ['senha'] as const) {
  @IsOptional() @IsString() @MaxLength(120) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/) senha?: string;
  @IsBoolean() ativo: boolean;
}
export class ClientDto {
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(160) nome: string;
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(32) documento: string;
  @IsEmail() @MaxLength(160) email: string;
  @IsOptional() @IsString() @MaxLength(32) telefone?: string;
  @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(99999999.99) valorHora: number;
  @IsOptional() @IsBoolean() enviarEmail?: boolean;
  @IsOptional() @IsBoolean() enviarWhatsapp?: boolean;
}
export class ClientUpdateDto extends ClientDto { @IsBoolean() ativo: boolean; }
export class ProjectDto {
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(160) nome: string;
  @IsOptional() @IsString() @MaxLength(5000) descricao?: string;
  @IsUUID() clienteId: string;
}
export class ProjectUpdateDto extends ProjectDto { @IsBoolean() ativo: boolean; }
