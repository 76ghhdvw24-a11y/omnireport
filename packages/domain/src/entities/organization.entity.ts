import { v4 as uuidv4 } from 'uuid';
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
        this.maxReports = 100;
        this.maxStorage = BigInt(10737418240); // 10GB
        break;
      case 'ENTERPRISE':
        this.maxReports = -1; // Unlimited
        this.maxStorage = BigInt(107374182400); // 100GB
        break;
      case 'FREE':
      default:
        this.maxReports = 10;
        this.maxStorage = BigInt(1073741824); // 1GB
        break;
    }
  }

  canCreateReport(reportCount: number): boolean {
    return this.maxReports === -1 || reportCount < this.maxReports;
  }
}
