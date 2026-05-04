import { ISubscriptionRepository } from '@omnireport/domain';
import { LemonSqueezyService } from '@omnireport/infrastructure';
import { SubscriptionStatus } from '@omnireport/shared';

export interface CancelSubscriptionUseCaseDeps {
  subscriptionRepo: ISubscriptionRepository;
  lemonSqueezyService: LemonSqueezyService;
  prisma: any;
}

export class CancelSubscriptionUseCase {
  private subscriptionRepo: ISubscriptionRepository;
  private lemonSqueezyService: LemonSqueezyService;
  private prisma: any;

  constructor(deps: CancelSubscriptionUseCaseDeps) {
    this.subscriptionRepo = deps.subscriptionRepo;
    this.lemonSqueezyService = deps.lemonSqueezyService;
    this.prisma = deps.prisma;
  }

  async execute(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepo.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.lemonSqueezyId) {
      await this.lemonSqueezyService.cancelSubscription(subscription.lemonSqueezyId);
    }

    await this.subscriptionRepo.update(subscriptionId, {
      status: SubscriptionStatus.CANCELLED,
      endsAt: new Date(),
    });

    await this.prisma.organization.update({
      where: { id: subscription.organizationId },
      data: {
        plan: 'FREE',
        maxReports: 10,
        maxStorage: BigInt(1073741824),
      },
    });
  }
}
