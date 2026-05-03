import { UserRole } from '@omnireport/shared';
export interface UserProps {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class User {
    readonly id: string;
    readonly email: string;
    readonly passwordHash: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly role: UserRole;
    readonly isActive: boolean;
    readonly organizationId: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    constructor(props: UserProps);
    static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): User;
    get fullName(): string;
    isAdmin(): boolean;
}
//# sourceMappingURL=user.entity.d.ts.map