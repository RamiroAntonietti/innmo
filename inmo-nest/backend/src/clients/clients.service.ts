import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './clients.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { search, tipo, estado, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (search) where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { apellido: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where, skip: (page - 1) * limit, take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cliente.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.cliente.findFirst({ where: { id, tenantId } });
    if (!client) throw new NotFoundException('Cliente no encontrado.');
    return client;
  }

  async create(tenantId: string, dto: CreateClientDto) {
    return this.prisma.cliente.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(tenantId, id);
    return this.prisma.cliente.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.cliente.delete({ where: { id } });
  }
}
