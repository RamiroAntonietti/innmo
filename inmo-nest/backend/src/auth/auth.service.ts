import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { LoginDto, RegisterDto } from './auth.dto';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
    private mail: MailService,
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

    // Enviar email de bienvenida (no bloqueante)
    this.mail.sendWelcomeInmobiliaria(result.admin.email, {
      nombreInmobiliaria: result.tenant.nombre,
      emailAdmin: result.admin.email,
      nombreAdmin: `${result.admin.nombre} ${result.admin.apellido}`,
    }).catch((err) => console.error('Error enviando email de bienvenida:', err?.message));

    const token = this.generateToken(result.admin, result.tenant.id);
    return { token, tenant: result.tenant, usuario: this.sanitize(result.admin) };
  }

  async login({ email, password }: LoginDto, ip?: string) {
    const emailNorm = email.trim().toLowerCase();
    const passwordNorm = (password ?? '').trim();
    // Buscar usuarios con este email en cualquier tenant (cada email pertenece a la inmobiliaria que lo creó)
    const candidatos = await this.prisma.usuario.findMany({
      where: {
        email: { equals: emailNorm, mode: 'insensitive' },
        deletedAt: null,
      },
      include: { tenant: true },
    });

    const activos = candidatos.filter(
      (u) => u.tenant?.activo && u.activo,
    );

    if (candidatos.length === 0) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    if (activos.length === 0) {
      throw new UnauthorizedException('Usuario o inmobiliaria inactivos. Contactá al administrador.');
    }

    // Probar contraseña en cada usuario (mismo email puede existir en distintos tenants)
    let usuario: (typeof activos)[0] | null = null;
    const isDev = process.env.NODE_ENV !== 'production';
    for (const u of activos) {
      const hashLooksBcrypt = typeof u.password === 'string' && /^\$2[ab]\$\d{2}\$/.test(u.password);
      const valid = hashLooksBcrypt && (await bcrypt.compare(passwordNorm, u.password));
      if (valid) {
        if (u.lockedUntil && u.lockedUntil > new Date()) {
          const mins = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60000);
          throw new UnauthorizedException(`Cuenta bloqueada. Intentá en ${mins} minuto(s).`);
        }
        usuario = u;
        break;
      }
    }

    if (!usuario) {
      const toLock = activos[0];
      const hashLooksBcrypt = /^\$2[ab]\$\d{2}\$/.test(toLock.password);
      let msg = 'Credenciales inválidas.';
      if (isDev && !hashLooksBcrypt) {
        msg = 'La contraseña en la base no tiene formato bcrypt ($2a$12$...). Usá POST /auth/reset-password con tu email y una nueva contraseña para generarla bien.';
      } else if (isDev && hashLooksBcrypt) {
        msg = 'Contraseña incorrecta. El usuario existe; si la cambiaste a mano, probá POST /auth/reset-password para establecer una nueva.';
      } else {
        const attempts = toLock.loginAttempts + 1;
        const updateData: any = { loginAttempts: attempts };
        if (attempts >= MAX_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
          updateData.loginAttempts = 0;
        }
        await this.prisma.usuario.update({ where: { id: toLock.id }, data: updateData });
        await this.audit.log({
          tenantId: toLock.tenantId,
          usuarioId: toLock.id,
          accion: 'LOGIN_FAILED',
          entidad: 'usuario',
          entidadId: toLock.id,
          detalle: { attempts, ip },
        });
        if (attempts >= MAX_ATTEMPTS) {
          throw new UnauthorizedException(`Demasiados intentos. Cuenta bloqueada ${LOCK_MINUTES} minutos.`);
        }
        const restantes = MAX_ATTEMPTS - attempts;
        msg = `Credenciales inválidas. ${restantes} intento(s) restante(s).`;
      }
      throw new UnauthorizedException(msg);
    }

    const tenant = usuario.tenant!;

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    await this.audit.log({
      tenantId: tenant.id,
      usuarioId: usuario.id,
      accion: 'LOGIN',
      entidad: 'usuario',
      entidadId: usuario.id,
      detalle: { ip },
    });

    return { token: this.generateToken(usuario, tenant.id), usuario: this.sanitize(usuario), tenant };
  }

  /** Solo desarrollo: restablece la contraseña de un usuario por email (hasheada con bcrypt). */
  async resetPasswordDev(email: string, newPassword: string) {
    this.validatePassword(newPassword);
    const emailNorm = email.trim().toLowerCase();
    const usuarios = await this.prisma.usuario.findMany({
      where: { email: { equals: emailNorm, mode: 'insensitive' }, deletedAt: null },
    });
    if (usuarios.length === 0) throw new BadRequestException('No se encontró ningún usuario con ese email.');
    const hash = await bcrypt.hash(newPassword, 12);
    for (const u of usuarios) {
      await this.prisma.usuario.update({ where: { id: u.id }, data: { password: hash, loginAttempts: 0, lockedUntil: null } });
    }
    return { message: `Contraseña actualizada para ${usuarios.length} usuario(s). Ahora podés iniciar sesión.` };
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
