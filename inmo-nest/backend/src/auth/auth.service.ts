import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RegisterDto } from './auth.dto';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  async register({ tenant: td, admin: ad }: RegisterDto) {
    // Validar contraseña robusta
    this.validatePassword(ad.password);

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

    await this.audit.log({
      tenantId: result.tenant.id,
      usuarioId: result.admin.id,
      accion: 'CREATE',
      entidad: 'tenant',
      entidadId: result.tenant.id,
      detalle: { nombre: result.tenant.nombre },
    });

    const token = this.generateToken(result.admin, result.tenant.id);
    return { token, tenant: result.tenant, usuario: this.sanitize(result.admin) };
  }

  async login({ tenantEmail, email, password }: LoginDto, ip?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { email: tenantEmail } });
    if (!tenant?.activo) throw new UnauthorizedException('Inmobiliaria no encontrada o inactiva.');

    const usuario = await this.prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (!usuario || usuario.deletedAt) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // Check if account is locked
    if (usuario.lockedUntil && usuario.lockedUntil > new Date()) {
      const mins = Math.ceil((usuario.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Cuenta bloqueada. Intentá en ${mins} minuto(s).`);
    }

    if (!usuario.activo) throw new UnauthorizedException('Usuario inactivo. Contactá al administrador.');

    const valid = await bcrypt.compare(password, usuario.password);

    if (!valid) {
      const attempts = usuario.loginAttempts + 1;
      const updateData: any = { loginAttempts: attempts };

      if (attempts >= MAX_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        updateData.loginAttempts = 0;
      }

      await this.prisma.usuario.update({ where: { id: usuario.id }, data: updateData });

      await this.audit.log({
        tenantId: tenant.id, usuarioId: usuario.id,
        accion: 'LOGIN_FAILED', entidad: 'usuario', entidadId: usuario.id,
        detalle: { attempts, ip },
      });

      if (attempts >= MAX_ATTEMPTS) {
        throw new UnauthorizedException(`Demasiados intentos. Cuenta bloqueada ${LOCK_MINUTES} minutos.`);
      }

      const restantes = MAX_ATTEMPTS - attempts;
      throw new UnauthorizedException(`Credenciales inválidas. ${restantes} intento(s) restante(s).`);
    }

    // Reset attempts on success
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    await this.audit.log({
      tenantId: tenant.id, usuarioId: usuario.id,
      accion: 'LOGIN', entidad: 'usuario', entidadId: usuario.id,
      detalle: { ip },
    });

    return { token: this.generateToken(usuario, tenant.id), usuario: this.sanitize(usuario), tenant };
  }

  async me(userId: string, tenantId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      include: { tenant: { select: { nombre: true, plan: true } } },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado.');
    return this.sanitize(usuario);
  }

  private validatePassword(password: string) {
    if (password.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    if (!/[a-zA-Z]/.test(password)) throw new BadRequestException('La contraseña debe contener al menos una letra.');
    if (!/[0-9]/.test(password)) throw new BadRequestException('La contraseña debe contener al menos un número.');
  }

  private generateToken(usuario: any, tenantId: string) {
    return this.jwt.sign({ sub: usuario.id, id: usuario.id, tenantId, rol: usuario.rol, email: usuario.email });
  }

  private sanitize({ password, loginAttempts, lockedUntil, ...rest }: any) { return rest; }
}
