import { ISubscriptionRepository, OrganizationEntity } from '@omnireport/domain';
import { SubscriptionStatus, mapLemonSqueezyStatus } from '@omnireport/shared';
import { PrismaClient } from '@prisma/client';

export interface UpdateSubscriptionStatusUseCaseDeps {
  subscriptionRepo: ISubscriptionRepository;
  prisma: PrismaClient;
}

export interface SubscriptionEvent {
  eventName: string;
  data: {
    id: string;
    status: string;
    variantId: number;
    customerId: number;
    renewsAt: string | null;
    endsAt: string | null;
    organizationId: string;
    customerName?: string;
  };
}

const VARIANT_PLAN_MAP: Record<string, 'PRO' | 'ENTERPRISE'> = {
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
};

export class UpdateSubscriptionStatusUseCase {
  private subscriptionRepo: ISubscriptionRepository;
  private prisma: PrismaClient;

  constructor(deps: UpdateSubscriptionStatusUseCaseDeps) {
    this.subscriptionRepo = deps.subscriptionRepo;
    this.prisma = deps.prisma;
  }

  async execute(event: SubscriptionEvent): Promise<void> {
    const { eventName, data } = event;
    const { organizationId, variantId, status, customerId, renewsAt, endsAt } = data;

    const mappedStatus = mapLemonSqueezyStatus(status);

    let subscription = await this.subscriptionRepo.findByOrganizationId(organizationId);

    if (!subscription) {
      subscription = await this.subscriptionRepo.create({
        organizationId,
        lemonSqueezyId: data.id,
        customerId: String(customerId),
        variantId: String(variantId),
        status: mappedStatus,
        renewsAt: renewsAt ? new Date(renewsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      });
    } else {
      await this.subscriptionRepo.update(subscription.id, {
        lemonSqueezyId: data.id,
        customerId: String(customerId),
        variantId: String(variantId),
        status: mappedStatus,
        renewsAt: renewsAt ? new Date(renewsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      });
    }

    await this.updateOrganizationPlan(organizationId, mappedStatus, String(variantId));
  }

  private async updateOrganizationPlan(orgId: string, status: SubscriptionStatus, variantId: string): Promise<void> {
    let plan: 'FREE' | 'PRO' | 'ENTERPRISE' = 'FREE';
    let maxReports = 10;
    let maxStorage = BigInt(1073741824);

    if (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALLING) {
      const planFromVariant = this.getPlanFromVariantId(variantId);
      plan = planFromVariant;

      switch (planFromVariant) {
        case 'PRO':
          maxReports = 100;
          maxStorage = BigInt(10737418240);
          break;
        case 'ENTERPRISE':
          maxReports = -1;
          maxStorage = BigInt(107374182400);
          break;
      }
    }

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { plan, maxReports, maxStorage },
    });
  }

  private getPlanFromVariantId(variantId: string): 'FREE' | 'PRO' | 'ENTERPRISE' {
    const proVariants = process.env.NEXT_PUBLIC_VARIANT_ID_PRO?.split(',') || [];
    const enterpriseVariants = process.env.NEXT_PUBLIC_VARIANT_ID_ENTERPRISE?.split(',') || [];

    if (proVariants.includes(variantId)) return 'PRO';
    if (enterpriseVariants.includes(variantId)) return 'ENTERPRISE';

    return 'FREE';
  }
}
