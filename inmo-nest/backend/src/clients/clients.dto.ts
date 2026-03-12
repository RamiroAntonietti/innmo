// ── DTOs ──────────────────────────────────────
import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator';

export enum TipoCliente { COMPRADOR='COMPRADOR', VENDEDOR='VENDEDOR', INQUILINO='INQUILINO', PROPIETARIO='PROPIETARIO' }
export enum EstadoCliente { ACTIVO='ACTIVO', INACTIVO='INACTIVO', PROSPECTO='PROSPECTO', CERRADO='CERRADO' }

export class CreateClientDto {
  @IsString() @MinLength(2) nombre: string;
  @IsString() @MinLength(2) apellido: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() telefono?: string;
  @IsEnum(TipoCliente) tipo: TipoCliente;
  @IsEnum(EstadoCliente) @IsOptional() estado?: EstadoCliente;
  @IsString() @IsOptional() notas?: string;
  @IsString() @IsOptional() cuit?: string;
  @IsString() @IsOptional() razonSocial?: string;
  @IsString() @IsOptional() condicionIva?: string;
  @IsString() @IsOptional() domicilioFiscal?: string;
  @IsBoolean() @IsOptional() requiereFactura?: boolean;
}

export class UpdateClientDto {
  @IsString() @IsOptional() nombre?: string;
  @IsString() @IsOptional() apellido?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() telefono?: string;
  @IsEnum(TipoCliente) @IsOptional() tipo?: TipoCliente;
  @IsEnum(EstadoCliente) @IsOptional() estado?: EstadoCliente;
  @IsString() @IsOptional() notas?: string;
  @IsString() @IsOptional() cuit?: string;
  @IsString() @IsOptional() razonSocial?: string;
  @IsString() @IsOptional() condicionIva?: string;
  @IsString() @IsOptional() domicilioFiscal?: string;
  @IsBoolean() @IsOptional() requiereFactura?: boolean;
}
