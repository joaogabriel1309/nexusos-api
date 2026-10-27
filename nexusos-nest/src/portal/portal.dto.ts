import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ApprovePortalOrderDto {
  @IsOptional() @IsString() @MaxLength(2000) observacao?: string;
}

export class RejectPortalOrderDto {
  @IsString() @Matches(/\S/) @MinLength(1) @MaxLength(2000) observacao!: string;
}

export class ConfirmPortalPaymentDto {
  @IsString() @MinLength(1) @MaxLength(120) @Matches(/^[A-Za-z0-9._-]+$/) paymentId!: string;
}

export class PortalAttachmentDto {
  @IsOptional() @IsString() @MaxLength(1000) descricao?: string;
}
