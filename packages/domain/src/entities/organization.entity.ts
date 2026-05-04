import { v4 as uuidv4 } from 'uuid';
import { Plan } from '@omnireport/shared';

export const PLAN_LIMITS = {
  FREE: { maxReports: 5, maxStorageGB: 0.5 },
  PRO: { maxReports: 50, maxStorageGB: 10 },
  ENTERPRISE: { maxReports: 200, maxStorageGB: 100 },
};

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

export class Organization {
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

  constructor(props: OrganizationProps) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.logoUrl = props.logoUrl;
    this.plan = props.plan;
    this.maxReports = props.maxReports;
    this.maxStorage = props.maxStorage;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<OrganizationProps, 'id' | 'createdAt' | 'updatedAt'>): Organization {
    const now = new Date();
    return new Organization({
      ...props,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    });
  }

  upgradePlan(newPlan: Plan): void {
    if (this.plan === newPlan) return;

    this.plan = newPlan;
    this.updatedAt = new Date();

    switch (newPlan) {
      case 'PRO':
        this.maxReports = PLAN_LIMITS.PRO.maxReports;
        this.maxStorage = BigInt(PLAN_LIMITS.PRO.maxStorageGB * 1024 * 1024 * 1024);
        break;
      case 'ENTERPRISE':
        this.maxReports = PLAN_LIMITS.ENTERPRISE.maxReports;
        this.maxStorage = BigInt(PLAN_LIMITS.ENTERPRISE.maxStorageGB * 1024 * 1024 * 1024);
        break;
      case 'FREE':
      default:
        this.maxReports = PLAN_LIMITS.FREE.maxReports;
        this.maxStorage = BigInt(PLAN_LIMITS.FREE.maxStorageGB * 1024 * 1024 * 1024);
        break;
    }
  }

  canCreateReport(reportCount: number): boolean {
    const limit = PLAN_LIMITS[this.plan].maxReports;
    return reportCount < limit;
  }
}
