import { PrismaClient } from '@prisma/client';
export interface CreateUserInput {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'MEMBER';
    organizationId: string;
}
export declare class PrismaUserRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    findByEmail(email: string): Promise<{
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        passwordHash: string;
        firstName: string;
        lastName: string;
    } | null>;
    findById(id: string): Promise<{
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        passwordHash: string;
        firstName: string;
        lastName: string;
    } | null>;
    create(data: CreateUserInput): Promise<{
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        passwordHash: string;
        firstName: string;
        lastName: string;
    }>;
}
//# sourceMappingURL=prisma-user.repository.d.ts.map