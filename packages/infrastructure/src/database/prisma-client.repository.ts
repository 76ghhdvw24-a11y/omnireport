import { PrismaClient } from '@prisma/client';
import { Client } from '@omnireport/shared';

export class PrismaClientRepository {
  constructor(private prisma: PrismaClient) {}

  async findByOrganizationId(organizationId: string): Promise<Client[]> {
    const clients = await this.prisma.client.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return clients.map(this.mapToClient);
  }

  async findById(id: string): Promise<Client | null> {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) return null;
    return this.mapToClient(client);
  }

  async create(data: { name: string; email?: string | null; phone?: string | null; address?: string | null; taxId?: string | null; organizationId: string }): Promise<Client> {
    const client = await this.prisma.client.create({ data });
    return this.mapToClient(client);
  }

  async update(id: string, data: { name?: string; email?: string | null; phone?: string | null; address?: string | null; taxId?: string | null }): Promise<Client> {
    const client = await this.prisma.client.update({ where: { id }, data });
    return this.mapToClient(client);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.delete({ where: { id } });
  }

  private mapToClient(prismaClient: any): Client {
    return {
      id: prismaClient.id,
      name: prismaClient.name,
      email: prismaClient.email,
      phone: prismaClient.phone,
      address: prismaClient.address,
      taxId: prismaClient.taxId,
      organizationId: prismaClient.organizationId,
      createdAt: prismaClient.createdAt,
      updatedAt: prismaClient.updatedAt,
    };
  }
}