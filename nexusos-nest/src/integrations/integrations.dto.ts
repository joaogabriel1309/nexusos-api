import { IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class EmpresaSettingsDto {
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(160) nome: string;
  @IsOptional() @IsString() @MaxLength(2800000) @Matches(/^$|^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/) logo?: string;
  @IsOptional() @IsString() @MaxLength(18) @Matches(/^$|^(?:\D*\d){11}(?:\D*\d{3})?\D*$/) documento?: string;
  @Transform(({ value }) => value === '' ? null : value) @IsOptional() @IsEmail() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(32) telefone?: string;
  @IsOptional() @IsString() @MaxLength(300) endereco?: string;
  @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) corPrincipal: string;
}

export class OsSettingsDto {
  @IsInt() @Min(0) @Max(3650) prazoBaixaDias: number;
  @IsInt() @Min(0) @Max(3650) prazoMediaDias: number;
  @IsInt() @Min(0) @Max(3650) prazoAltaDias: number;
  @IsInt() @Min(0) @Max(3650) prazoCriticaDias: number;
  @IsIn(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']) prioridadePadrao: string;
  @IsOptional() @IsUUID() responsavelPadraoId?: string;
  @IsBoolean() permitirSemResponsavel: boolean;
  @IsIn(['RECEBIDA', 'EM_ANALISE', 'AGUARDANDO_APROVACAO', 'APROVADA', 'EM_DESENVOLVIMENTO', 'EM_TESTE', 'AGUARDANDO_PAGAMENTO', 'FINALIZADA', 'CANCELADA']) statusInicial: string;
  @IsBoolean() exigirAnaliseAntesCliente: boolean;
  @IsBoolean() exigirAprovacaoAdminAntesCliente: boolean;
}

export class IaSettingsDto {
  @Transform(({ value }) => value == null ? false : value) @IsBoolean() habilitado = false;
  @IsString() @Matches(/^https:\/\/api\.openai\.com\/v1\/chat\/completions$/) @MaxLength(300) apiUrl: string;
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(100) modelo: string;
  @IsOptional() @IsString() @MaxLength(500) apiKey?: string;
  @IsNumber() @Min(0) @Max(2) temperatura: number;
}

export class EmailSettingsDto {
  @IsBoolean() habilitado: boolean;
  @IsOptional() @IsString() @MaxLength(255) smtpHost?: string;
  @IsOptional() @IsInt() @Min(1) @Max(65535) smtpPort?: number;
  @IsOptional() @IsString() @MaxLength(255) smtpUsuario?: string;
  @IsOptional() @IsString() @MaxLength(500) smtpSenha?: string;
  @Transform(({ value }) => value === '' ? null : value) @IsOptional() @IsEmail() @MaxLength(255) emailRemetente?: string;
}

export class EmailTestDto {
  @IsEmail() @IsNotEmpty() @MaxLength(255) destinatario: string;
}

export class WhatsappSettingsDto {
  @IsBoolean() habilitado: boolean;
  @IsIn(['CALLMEBOT', 'META']) provedor: string;
  @IsOptional() @IsString() @MaxLength(1000) credencial?: string;
  @IsOptional() @IsString() @Matches(/^$|^\+?[0-9 ()-]{10,32}$/) numeroPadrao?: string;
  @IsOptional() @IsString() @MaxLength(100) @Matches(/^$|^[0-9]+$/) metaPhoneNumberId?: string;
}

export class GithubSettingsDto {
  @Transform(({ value }) => value == null ? false : value) @IsBoolean() habilitado = false;
  @IsOptional() @IsString() @MaxLength(255) owner?: string;
  @IsOptional() @IsString() @MaxLength(255) repositorio?: string;
  @IsOptional() @IsString() @MaxLength(500) token?: string;
  @IsOptional() @IsString() @MaxLength(255) branchPrincipal?: string;
}

export class PaymentSettingsDto {
  @IsOptional() @IsString() @MaxLength(2000) mercadoPagoToken?: string;
  @IsOptional() @IsString() @MaxLength(255) mercadoPagoChavePublica?: string;
  @IsInt() @Min(5) @Max(10080) expiracaoLinkMinutos: number;
  @IsBoolean() cobrarAutomaticamenteOsFinalizada: boolean;
  @IsBoolean() permitirOsSemCobranca: boolean;
}
