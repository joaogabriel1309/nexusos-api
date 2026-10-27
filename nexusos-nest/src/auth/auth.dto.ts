import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
export class LoginDto {
  @IsEmail() @MaxLength(160) email: string;
  @IsString() @IsNotEmpty() senha: string;
}
export class RefreshDto { @IsOptional() @IsString() refreshToken?: string; }
export class ForgotDto { @IsEmail() @MaxLength(160) email: string; }
export class ResetDto {
  @IsString() @IsNotEmpty() token: string;
  @IsString() @MaxLength(120) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/) novaSenha: string;
}
