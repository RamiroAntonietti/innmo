import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register({ tenant: td, admin: ad }: RegisterDto) {
    const exists = await this.prisma.tenant.findUnique({ where: { email: td.email } });
    if (exists) throw new ConflictException('Ya existe una inmobiliaria con ese email.');

    const hash = await bcrypt.hash(ad.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { nombre: td.nombre, email: td.email, telefono: td.telefono },
      });
      const admin = await tx.usuario.create({
        data: { tenantId: tenant.id, nombre: ad.nombre, apellido: ad.apellido,
          email: ad.email, password: hash, rol: 'ADMIN' },
      });
      return { tenant, admin };
    });

    const token = this.generateToken(result.admin, result.tenant.id);
    return { token, tenant: result.tenant, usuario: this.sanitize(result.admin) };
  }

  async login({ tenantEmail, email, password }: LoginDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { email: tenantEmail } });
    if (!tenant?.activo) throw new UnauthorizedException('Inmobiliaria no encontrada o inactiva.');

    const usuario = await this.prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: email } },
    });
    if (!usuario?.activo) throw new UnauthorizedException('Credenciales inválidas.');

    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas.');

    return { token: this.generateToken(usuario, tenant.id), usuario: this.sanitize(usuario), tenant };
  }

  async me(userId: string, tenantId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: userId, tenantId },
      include: { tenant: { select: { nombre: true, plan: true } } },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado.');
    return this.sanitize(usuario);
  }

  private generateToken(usuario: any, tenantId: string) {
    return this.jwt.sign({ sub: usuario.id, id: usuario.id, tenantId, rol: usuario.rol, email: usuario.email });
  }

  private sanitize({ password, ...rest }: any) { return rest; }
}
