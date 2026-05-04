import { ISubscriptionRepository, OrganizationEntity } from '@omnireport/domain';
import { SubscriptionStatus, isActiveSubscription } from '@omnireport/shared';
import { PrismaClient } from '@prisma/client';

export interface ValidateReportCreationUseCaseDeps {
  subscriptionRepo: ISubscriptionRepository;
  prisma: PrismaClient;
}

export interface ValidationResult {
  canCreate: boolean;
  reason?: string;
  currentCount?: number;
  maxReports?: number;
  plan?: string;
}

export class ValidateReportCreationUseCase {
  private subscriptionRepo: ISubscriptionRepository;
  private prisma: PrismaClient;

  constructor(deps: ValidateReportCreationUseCaseDeps) {
    this.subscriptionRepo = deps.subscriptionRepo;
    this.prisma = deps.prisma;
  }

  async execute(organizationId: string): Promise<ValidationResult> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return { canCreate: false, reason: 'Organization not found' };
    }

    const subscription = await this.subscriptionRepo.findByOrganizationId(organizationId);

    const isPaidPlan = org.plan === 'PRO' || org.plan === 'ENTERPRISE';

    if (isPaidPlan) {
      if (!subscription) {
        return {
          canCreate: false,
          reason: 'No active subscription found. Please subscribe to continue.',
          plan: org.plan,
        };
      }

      if (!isActiveSubscription(subscription.status)) {
        return {
          canCreate: false,
          reason: `Subscription is ${subscription.status.toLowerCase()}. Please update your payment method or renew your subscription.`,
          plan: org.plan,
        };
      }
    }

    const reportCount = await this.prisma.report.count({
      where: { organizationId },
    });

    const maxReports = org.plan === 'ENTERPRISE' ? -1 : org.plan === 'PRO' ? 100 : 10;

    if (maxReports !== -1 && reportCount >= maxReports) {
      return {
        canCreate: false,
        reason: `Your ${org.plan} plan allows up to ${maxReports} reports. Upgrade to create more.`,
        currentCount: reportCount,
        maxReports,
        plan: org.plan,
      };
    }

    return { canCreate: true, currentCount: reportCount, maxReports, plan: org.plan };
  }
}
