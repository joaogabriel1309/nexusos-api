import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export const PRIORITIES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
export const REJECTION_REASONS = ['FORA_ESCOPO', 'FUNCIONALIDADE_EXISTENTE', 'INFORMACOES_INSUFICIENTES', 'DUPLICADA', 'OUTRO'];

export class RequestMessageDto {
  @IsString() @Matches(/\S/) @MinLength(1) @MaxLength(5000) mensagem!: string;
}

export class RequestOwnerDto {
  @IsOptional() @IsUUID() responsavelId?: string | null;
}

export class RejectRequestDto {
  @IsIn(REJECTION_REASONS) motivo!: string;
  @IsString() @Matches(/\S/) @MinLength(1) @MaxLength(2000) detalhe!: string;
}

export class ConvertRequestDto {
  @IsString() @Matches(/\S/) @MinLength(1) @MaxLength(180) titulo!: string;
  @IsString() @Matches(/\S/) @MinLength(1) @MaxLength(10000) descricao!: string;
  @IsOptional() @IsUUID() projetoId?: string;
  @IsOptional() @IsUUID() responsavelId?: string;
  @IsOptional() @IsIn(PRIORITIES) prioridade?: string;
  @IsOptional() @IsISO8601({ strict: true }) prazo?: string;
  @IsOptional() @IsBoolean() prazoIndefinido?: boolean;
}

export class CreatePortalRequestDto {
  @IsString() @Matches(/\S/) @MinLength(1) @MaxLength(180) titulo!: string;
  @IsString() @Matches(/\S/) @MinLength(1) @MaxLength(10000) descricao!: string;
  @IsOptional() @IsIn(PRIORITIES) prioridade?: string;
}
