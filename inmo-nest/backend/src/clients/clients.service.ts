import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateClientDto, UpdateClientDto } from './clients.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(tenantId: string, query: any) {
    const { search, tipo, estado, page = 1, limit = 20 } = query;
    const where: any = { tenantId, deletedAt: null };
    if (search) where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { apellido: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.cliente.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!client) throw new NotFoundException('Cliente no encontrado.');
    return client;
  }

  async create(tenantId: string, dto: CreateClientDto, usuarioId?: string) {
    // Validar email único dentro del tenant
    if (dto.email) {
      const exists = await this.prisma.cliente.findFirst({
        where: { tenantId, email: dto.email, deletedAt: null },
      });
      if (exists) throw new ConflictException('Ya existe un cliente con ese email.');
    }

    const cliente = await this.prisma.cliente.create({ data: { ...dto, tenantId } });

    await this.audit.log({
      tenantId, usuarioId, accion: 'CREATE', entidad: 'cliente',
      entidadId: cliente.id, detalle: { nombre: `${dto.nombre} ${dto.apellido}`, tipo: dto.tipo },
    });

    return cliente;
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto, usuarioId?: string) {
    const existing = await this.findOne(tenantId, id);

    // Validar email único si cambia
    if (dto.email && dto.email !== existing.email) {
      const emailExists = await this.prisma.cliente.findFirst({
        where: { tenantId, email: dto.email, deletedAt: null, NOT: { id } },
      });
      if (emailExists) throw new ConflictException('Ya existe un cliente con ese email.');
    }

    const cliente = await this.prisma.cliente.update({ where: { id }, data: dto });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'cliente',
      entidadId: id, detalle: { cambios: dto },
    });

    return cliente;
  }

  async remove(tenantId: string, id: string, usuarioId?: string) {
    await this.findOne(tenantId, id);

    // Verificar integridad antes de eliminar
    const [contratosActivos, propiedades, pagos] = await Promise.all([
      this.prisma.contratoAlquiler.count({
        where: { inquilinoId: id, estado: { in: ['ACTIVO', 'ATRASADO'] } },
      }),
      this.prisma.propiedad.count({
        where: { propietarioId: id, deletedAt: null },
      }),
      this.prisma.pagoAlquiler.count({
        where: { contrato: { inquilinoId: id } },
      }),
    ]);

    if (contratosActivos > 0) {
      throw new BadRequestException('No se puede eliminar: el cliente tiene contratos activos. Desactivalo en su lugar.');
    }
    if (propiedades > 0) {
      throw new BadRequestException('No se puede eliminar: el cliente es propietario de propiedades activas.');
    }
    if (pagos > 0) {
      throw new BadRequestException('No se puede eliminar: el cliente tiene historial de pagos. Desactivalo en su lugar.');
    }

    // Soft delete
    await this.prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date(), estado: 'CERRADO' as any },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'SOFT_DELETE', entidad: 'cliente', entidadId: id,
    });

    return { message: 'Cliente eliminado correctamente.' };
  }

  async desactivar(tenantId: string, id: string, usuarioId?: string) {
    await this.findOne(tenantId, id);
    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: { estado: 'INACTIVO' as any },
    });
    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'cliente',
      entidadId: id, detalle: { accion: 'desactivar' },
    });
    return cliente;
  }
}
