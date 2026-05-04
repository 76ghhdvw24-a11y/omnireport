import { PrismaClient, Prisma } from '@prisma/client';
import { CreateTemplateInput, UpdateTemplateInput } from './prisma-template.repository.types';

export class PrismaTemplateRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.template.findUnique({ where: { id } });
  }

  async findByOrganizationId(
    organizationId: string | null,
    options?: { skip?: number; take?: number }
  ): Promise<{ items: any[]; total: number }> {
    const where: Prisma.TemplateWhereInput = {};
    if (organizationId === null) {
      where.organizationId = null;
    } else {
      where.OR = [
        { organizationId: null },
        { organizationId },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip: options?.skip,
        take: options?.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.template.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: CreateTemplateInput) {
    return this.prisma.template.create({
      data: {
        name: data.name,
        description: data.description,
        industry: data.industry,
        systemPrompt: data.systemPrompt,
        outputFormat: data.outputFormat as Prisma.InputJsonValue,
        isActive: data.isActive ?? true,
        organizationId: data.organizationId,
      },
    });
  }

  async update(id: string, data: UpdateTemplateInput) {
    const updateData: Prisma.TemplateUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.industry !== undefined) updateData.industry = data.industry;
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.outputFormat !== undefined) updateData.outputFormat = data.outputFormat as Prisma.InputJsonValue;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.template.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    await this.prisma.template.delete({ where: { id } });
  }
}
