import { PrismaClient } from '@prisma/client';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export class PrismaOrganizationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  async create(data: CreateOrganizationInput) {
    return this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl || null,
      },
    });
  }
}
