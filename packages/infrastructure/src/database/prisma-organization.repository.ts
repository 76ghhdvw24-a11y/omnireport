import { PrismaClient } from '@prisma/client';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  country?: string | null;
  currency?: string;
  language?: string;
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
        address: data.address || null,
        phone: data.phone || null,
        taxId: data.taxId || null,
        country: data.country || null,
        currency: data.currency || 'USD',
        language: data.language || 'es',
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    address?: string | null;
    phone?: string | null;
    taxId?: string | null;
    country?: string | null;
    currency?: string;
    language?: string;
    logoUrl?: string | null;
  }) {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }
}