import {
  Injectable, UnauthorizedException, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async login(email: string, password: string) {
    const emailNorm = email.trim().toLowerCase();
    const acc = await this.prisma.portalAcceso.findFirst({
      where: { email: { equals: emailNorm, mode: 'insensitive' }, activo: true },
      include: { cliente: true, tenant: true },
    });
    if (!acc) throw new UnauthorizedException('Credenciales inválidas.');
    if (!acc.tenant?.activo) throw new UnauthorizedException('La inmobiliaria no está activa.');

    const valid = await bcrypt.compare(password, acc.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas.');

    const token = this.generatePortalToken(acc);
    return {
      token,
      usuario: {
        id: acc.id,
        clienteId: acc.clienteId,
        email: acc.email,
        rol: acc.rol,
        nombre: `${acc.cliente.nombre} ${acc.cliente.apellido}`,
        primerLogin: acc.primerLogin,
      },
      tenant: { id: acc.tenantId, nombre: acc.tenant.nombre },
    };
  }

  async cambiarPassword(portalId: string, passwordActual: string, passwordNueva: string) {
    const acc = await this.prisma.portalAcceso.findUnique({ where: { id: portalId } });
    if (!acc) throw new NotFoundException('Acceso no encontrado.');
    const valid = await bcrypt.compare(passwordActual, acc.password);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta.');

    const hash = await bcrypt.hash(passwordNueva, 12);
    await this.prisma.portalAcceso.update({
      where: { id: portalId },
      data: { password: hash, primerLogin: false },
    });
    return { success: true };
  }

  async miContrato(tenantId: string, clienteId: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({
      where: { tenantId, inquilinoId: clienteId, estado: { in: ['ACTIVO', 'ATRASADO'] } },
      include: {
        propiedad: { select: { titulo: true, direccion: true, ciudad: true } },
      },
    });
    if (!contrato) return null;
    return {
      ...contrato,
      montoMensual: Number(contrato.montoMensual),
      fechaInicio: contrato.fechaInicio,
      fechaFin: contrato.fechaFin,
    };
  }

  async misPagos(tenantId: string, clienteId: string) {
    const pagos = await this.prisma.pagoAlquiler.findMany({
      where: { contrato: { tenantId, inquilinoId: clienteId } },
      include: {
        contrato: { include: { propiedad: { select: { titulo: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return pagos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      monto: Number(p.monto),
      montoPagado: p.montoPagado ? Number(p.montoPagado) : null,
      estado: p.estado,
      fechaPago: p.fechaPago,
      formaPago: p.formaPago,
      propiedad: p.contrato.propiedad?.titulo,
    }));
  }

  async miDeuda(tenantId: string, clienteId: string) {
    const pendientes = await this.prisma.pagoAlquiler.findMany({
      where: {
        contrato: { tenantId, inquilinoId: clienteId },
        estado: { in: ['PENDIENTE', 'ATRASADO'] },
      },
      include: {
        contrato: { include: { propiedad: { select: { titulo: true } } } },
      },
    });
    const total = pendientes.reduce((s, p) => s + Number(p.monto), 0);
    return {
      items: pendientes.map((p) => ({
        id: p.id,
        monto: Number(p.monto),
        estado: p.estado,
        propiedad: p.contrato.propiedad?.titulo,
        codigo: p.codigo,
      })),
      total,
    };
  }

  async misPropiedades(tenantId: string, clienteId: string) {
    const props = await this.prisma.propiedad.findMany({
      where: { tenantId, propietarioId: clienteId, deletedAt: null },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        direccion: true,
        ciudad: true,
        precio: true,
        estado: true,
        tipoOperacion: true,
      },
    });
    return props.map((p) => ({ ...p, precio: Number(p.precio) }));
  }

  async misFacturasServicio(tenantId: string, clienteId: string) {
    const facturas = await this.prisma.facturaServicio.findMany({
      where: {
        tenantId,
        propiedad: { propietarioId: clienteId },
      },
      include: {
        propiedad: { select: { titulo: true } },
      },
      orderBy: { fechaVence: 'desc' },
    });
    return facturas.map((f) => ({
      id: f.id,
      tipoServicio: f.tipoServicio,
      monto: Number(f.monto),
      fechaVence: f.fechaVence,
      estado: f.estado,
      propiedad: f.propiedad?.titulo,
      notas: f.notas,
    }));
  }

  async misGastos(tenantId: string, clienteId: string) {
    const gastos = await this.prisma.gastoPropiedad.findMany({
      where: {
        tenantId,
        propiedad: { propietarioId: clienteId },
      },
      include: {
        propiedad: { select: { titulo: true } },
      },
      orderBy: { fecha: 'desc' },
    });
    return gastos.map((g) => ({
      id: g.id,
      tipo: g.tipo,
      descripcion: g.descripcion,
      monto: Number(g.monto),
      fecha: g.fecha,
      pagadoPor: g.pagadoPor,
      propiedad: g.propiedad?.titulo,
      comprobante: g.comprobante,
    }));
  }

  async misLiquidaciones(tenantId: string, clienteId: string) {
    const [contratos, tenant] = await Promise.all([
      this.prisma.contratoAlquiler.findMany({
        where: {
          tenantId,
          propiedad: { propietarioId: clienteId },
          estado: { in: ['ACTIVO', 'ATRASADO'] },
        },
        include: {
          propiedad: { select: { titulo: true } },
          pagos: { where: { estado: 'PAGADO' }, orderBy: { fechaPago: 'desc' } },
        },
      }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { comisionPorcentajeAlquiler: true } }),
    ]);

    const porcentajeComision = tenant?.comisionPorcentajeAlquiler ? Number(tenant.comisionPorcentajeAlquiler) : 0;
    const liquidaciones: any[] = [];
    for (const c of contratos) {
      for (const p of c.pagos) {
        const montoBruto = Number(p.montoPagado || p.monto);
        const comision = porcentajeComision > 0 ? parseFloat((montoBruto * porcentajeComision / 100).toFixed(2)) : 0;
        const netoPropietario = montoBruto - comision;
        liquidaciones.push({
          id: p.id,
          propiedad: c.propiedad?.titulo,
          montoBruto,
          comision,
          netoPropietario,
          monto: netoPropietario,
          fechaPago: p.fechaPago,
          codigo: p.codigo,
        });
      }
    }
    liquidaciones.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
    const items = liquidaciones.slice(0, 50);
    const totalBruto = items.reduce((s, l) => s + l.montoBruto, 0);
    const totalComision = items.reduce((s, l) => s + l.comision, 0);
    const totalNeto = items.reduce((s, l) => s + l.netoPropietario, 0);
    return {
      items,
      total: totalNeto,
      totalBruto,
      totalComision,
      totalNeto,
      porcentajeComision,
    };
  }

  async crearAcceso(tenantId: string, clienteId: string, password?: string, usuarioId?: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, tenantId, deletedAt: null },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    if (cliente.tipo !== 'INQUILINO' && cliente.tipo !== 'PROPIETARIO') {
      throw new BadRequestException('Solo se puede crear acceso para inquilinos o propietarios.');
    }
    if (!cliente.email) throw new BadRequestException('El cliente debe tener email para acceder al portal.');

    const existe = await this.prisma.portalAcceso.findUnique({ where: { clienteId } });
    if (existe) throw new ConflictException('Este cliente ya tiene acceso al portal.');

    const tempPassword = password || this.generarPasswordTemporal();
    const hash = await bcrypt.hash(tempPassword, 12);

    const acc = await this.prisma.portalAcceso.create({
      data: {
        tenantId,
        clienteId,
        email: cliente.email,
        password: hash,
        rol: cliente.tipo as 'INQUILINO' | 'PROPIETARIO',
      },
      include: { cliente: true, tenant: true },
    });

    const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    this.mail.sendPortalAccess(cliente.email, {
      nombre: `${cliente.nombre} ${cliente.apellido}`,
      email: cliente.email,
      passwordTemporal: tempPassword,
      portalUrl: `${portalUrl}/portal`,
      tipoPortal: acc.rol.toLowerCase() as 'inquilino' | 'propietario',
    }).catch((err) => console.error('Error enviando email de acceso:', err?.message));

    return {
      id: acc.id,
      email: acc.email,
      rol: acc.rol,
      password: tempPassword,
      mensaje: 'Acceso creado. Se envió un email con las credenciales.',
    };
  }

  private generatePortalToken(acc: any) {
    const secret = process.env.JWT_PORTAL_SECRET || process.env.JWT_SECRET || 'portal-secret';
    const expiresIn = process.env.JWT_PORTAL_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '7d';
    return this.jwt.sign(
      {
        sub: acc.id,
        id: acc.id,
        clienteId: acc.clienteId,
        tenantId: acc.tenantId,
        email: acc.email,
        rol: acc.rol,
        portal: true,
        primerLogin: acc.primerLogin,
      },
      { secret, expiresIn },
    );
  }

  private generarPasswordTemporal(longitud = 8): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let p = '';
    for (let i = 0; i < longitud; i++) p += chars[Math.floor(Math.random() * chars.length)];
    return p;
  }

  /** Crea acceso al portal para inquilino si no existe. Usado al crear contrato de alquiler. */
  async crearAccesoParaInquilino(tenantId: string, clienteId: string): Promise<{ email: string; password: string } | null> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, tenantId, deletedAt: null },
    });
    if (!cliente || cliente.tipo !== 'INQUILINO' || !cliente.email) return null;

    const existe = await this.prisma.portalAcceso.findUnique({ where: { clienteId } });
    if (existe) return null;

    const password = this.generarPasswordTemporal(8);
    const hash = await bcrypt.hash(password, 12);

    await this.prisma.portalAcceso.create({
      data: {
        tenantId,
        clienteId,
        email: cliente.email,
        password: hash,
        rol: 'INQUILINO',
      },
    });

    const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    this.mail.sendPortalAccess(cliente.email, {
      nombre: `${cliente.nombre} ${cliente.apellido}`,
      email: cliente.email,
      passwordTemporal: password,
      portalUrl: `${portalUrl}/portal`,
      tipoPortal: 'inquilino',
    }).catch((err) => console.error('Error enviando email de acceso:', err?.message));

    return { email: cliente.email, password };
  }

  /** Envía una consulta desde el portal (inquilino o propietario). */
  async enviarConsulta(tenantId: string, clienteId: string, rol: 'INQUILINO' | 'PROPIETARIO', mensaje: string) {
    const msg = mensaje?.trim();
    if (!msg) throw new BadRequestException('El mensaje no puede estar vacío.');

    await this.prisma.consultaPortal.create({
      data: { tenantId, clienteId, rol, mensaje: msg },
    });
    return { success: true, mensaje: 'Consulta enviada. Te responderemos a la brevedad.' };
  }

  /** Consultas enviadas por el cliente con sus respuestas. */
  async misConsultas(tenantId: string, clienteId: string) {
    return this.prisma.consultaPortal.findMany({
      where: { tenantId, clienteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Regenera contraseña del portal y la devuelve para que el admin pueda verla. */
  async regenerarPassword(tenantId: string, clienteId: string) {
    const acc = await this.prisma.portalAcceso.findFirst({
      where: { clienteId, tenantId },
      include: { cliente: true },
    });
    if (!acc) throw new NotFoundException('Este cliente no tiene acceso al portal.');

    const password = this.generarPasswordTemporal(8);
    const hash = await bcrypt.hash(password, 12);
    await this.prisma.portalAcceso.update({
      where: { id: acc.id },
      data: { password: hash, primerLogin: true },
    });

    this.mail.sendPortalAccess(acc.email, {
      nombre: `${acc.cliente.nombre} ${acc.cliente.apellido}`,
      email: acc.email,
      passwordTemporal: password,
      portalUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal`,
      tipoPortal: acc.rol.toLowerCase() as 'inquilino' | 'propietario',
    }).catch((err) => console.error('Error enviando email:', err?.message));

    return { email: acc.email, password };
  }
}
