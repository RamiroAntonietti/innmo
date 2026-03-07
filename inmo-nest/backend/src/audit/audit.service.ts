import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAccion = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'PAGO' | 'ANULAR' | 'SOFT_DELETE' | 'RESTORE';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    usuarioId?: string;
    accion: AuditAccion;
    entidad: string;
    entidadId?: string;
    detalle?: any;
    ip?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          usuarioId: params.usuarioId,
          accion: params.accion,
          entidad: params.entidad,
          entidadId: params.entidadId,
          detalle: params.detalle ? params.detalle : undefined,
          ip: params.ip,
        },
      });
    } catch (e) {
      // Audit failures should never break business logic
      console.error('Audit log error:', e.message);
    }
  }

  async findAll(tenantId: string, query: any) {
    const { entidad, accion, page = 1, limit = 50 } = query;
    const where: any = { tenantId };
    if (entidad) where.entidad = entidad;
    if (accion) where.accion = accion;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }
}
