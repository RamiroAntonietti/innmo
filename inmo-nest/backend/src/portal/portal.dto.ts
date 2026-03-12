import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class PortalLoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(1) password: string;
}

export class CrearAccesoDto {
  @IsString() clienteId: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}

export class CambiarPasswordDto {
  @IsString() @MinLength(8) passwordActual: string;
  @IsString() @MinLength(8) passwordNueva: string;
}

export class RegenerarPasswordDto {
  @IsString() clienteId: string;
}

export class EnviarConsultaDto {
  @IsString() @MinLength(1, { message: 'El mensaje no puede estar vacío' }) mensaje: string;
}
