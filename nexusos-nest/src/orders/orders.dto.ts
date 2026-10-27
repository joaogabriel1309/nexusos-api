import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, ArrayMaxSize, ArrayUnique, IsNumber, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';

export const STATUSES = ['RECEBIDA', 'EM_ANALISE', 'AGUARDANDO_APROVACAO', 'APROVADA', 'EM_DESENVOLVIMENTO', 'EM_TESTE', 'AGUARDANDO_PAGAMENTO', 'FINALIZADA', 'CANCELADA'];
export const PRIORITIES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
export class CreateOrderDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(180) titulo!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(10000) descricao!: string;
  @ApiProperty() @IsUUID() clienteId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() responsavelId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projetoId?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(PRIORITIES) prioridade?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString({ strict: true }) prazo?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() prazoIndefinido?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimativaHoras?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @ArrayMaxSize(50) @ArrayUnique() @IsUUID('all', { each: true }) ordemServicoIds?: string[];
}
export class UpdateOrderDto extends OmitType(CreateOrderDto, ['prioridade', 'ordemServicoIds'] as const) {
  @ApiProperty() @IsIn(PRIORITIES) prioridade!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) entendimento?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) impacto?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) riscos?: string;
}
export class OrderStatusDto {
  @ApiProperty() @IsIn(STATUSES) status!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) commitsFinalizacao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) branchFinalizacao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) arquivosAlteradosFinalizacao?: string;
}
export class ReasonDto { @ApiProperty() @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(1000) motivo!: string; }
export class AnalysisDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) entendimento?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) impacto?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) riscos?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimativaHoras?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cobrar?: boolean;
}
export class OwnerDto { @ApiProperty() @IsUUID() responsavelId!: string; }
export class PriorityDto { @ApiProperty() @IsIn(PRIORITIES) prioridade!: string; }
export class SequenceDto { @ApiProperty() @IsInt() @Min(1) posicao!: number; }
export class PaidDto { @ApiProperty() @IsBoolean() paga!: boolean; }
export class LinksDto { @ApiProperty() @IsArray() @ArrayUnique() @IsUUID('all', { each: true }) ordemServicoIds!: string[]; }
export class BranchDto { @ApiProperty() @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(255) branch!: string; }
export class CommentDto { @ApiProperty() @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(5000) mensagem!: string; }
export class ChecklistDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(500) descricao!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() obrigatorio?: boolean;
}
export class TimeEntryDto {
  @ApiProperty() @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(1000) descricao!: string;
  @ApiProperty() @IsDateString() inicio!: string;
  @ApiProperty() @IsDateString() fim!: string;
}
export class CalendarQueryDto {
  @ApiProperty() @IsDateString({ strict: true }) inicio!: string;
  @ApiProperty() @IsDateString({ strict: true }) fim!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() responsavelId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() clienteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projetoId?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(PRIORITIES) prioridade?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(STATUSES) status?: string;
}
