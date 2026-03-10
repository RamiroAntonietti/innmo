import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}

export class TenantDataDto {
  @IsString() @MinLength(2) nombre: string;
  @IsEmail() email: string;
  @IsString() @IsOptional() telefono?: string;
}

export class AdminDataDto {
  @IsString() @MinLength(2) nombre: string;
  @IsString() @MinLength(2) apellido: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}

export class RegisterDto {
  tenant: TenantDataDto;
  admin: AdminDataDto;
}
