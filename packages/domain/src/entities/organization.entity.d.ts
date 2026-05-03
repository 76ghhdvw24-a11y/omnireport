import { Plan } from '@omnireport/shared';
export interface OrganizationProps {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    plan: Plan;
    maxReports: number;
    maxStorage: bigint;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class Organization {
    readonly id: string;
    name: string;
    readonly slug: string;
    logoUrl: string | null;
    plan: Plan;
    maxReports: number;
    maxStorage: bigint;
    isActive: boolean;
    readonly createdAt: Date;
    updatedAt: Date;
    constructor(props: OrganizationProps);
    static create(props: Omit<OrganizationProps, 'id' | 'createdAt' | 'updatedAt'>): Organization;
    upgradePlan(newPlan: Plan): void;
    canCreateReport(reportCount: number): boolean;
}
//# sourceMappingURL=organization.entity.d.ts.map