export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  taxId: string | null;
  country: string | null;
  currency: string;
  language: string;
  plan: Plan;
  maxReports: number;
  maxStorage: bigint;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationRepository {
  findById(id: string): Promise<OrganizationEntity | null>;
  findBySlug(slug: string): Promise<OrganizationEntity | null>;
  create(data: Omit<OrganizationEntity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<OrganizationEntity>;
  update(id: string, data: Partial<OrganizationEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}