import { PrismaClient } from '@prisma/client';
export interface CreateOrganizationInput {
    name: string;
    slug: string;
    logoUrl?: string | null;
}
export declare class PrismaOrganizationRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    findById(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        slug: string;
        logoUrl: string | null;
        plan: import(".prisma/client").$Enums.Plan;
        maxReports: number;
        maxStorage: bigint;
    } | null>;
    findBySlug(slug: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        slug: string;
        logoUrl: string | null;
        plan: import(".prisma/client").$Enums.Plan;
        maxReports: number;
        maxStorage: bigint;
    } | null>;
    create(data: CreateOrganizationInput): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        slug: string;
        logoUrl: string | null;
        plan: import(".prisma/client").$Enums.Plan;
        maxReports: number;
        maxStorage: bigint;
    }>;
}
//# sourceMappingURL=prisma-organization.repository.d.ts.map