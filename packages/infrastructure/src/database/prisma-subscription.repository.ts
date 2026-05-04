import { PrismaClient } from '@prisma/client';
import { SubscriptionEntity, ISubscriptionRepository } from '@omnireport/domain';
import { SubscriptionStatus } from '@omnireport/shared';

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<SubscriptionEntity | null> {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    return sub as SubscriptionEntity | null;
  }

  async findByOrganizationId(orgId: string): Promise<SubscriptionEntity | null> {
    const sub = await this.prisma.subscription.findUnique({ where: { organizationId: orgId } });
    return sub as SubscriptionEntity | null;
  }

  async findByLemonSqueezyId(lsId: string): Promise<SubscriptionEntity | null> {
    const sub = await this.prisma.subscription.findUnique({ where: { lemonSqueezyId: lsId } });
    return sub as SubscriptionEntity | null;
  }

  async create(data: Omit<SubscriptionEntity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<SubscriptionEntity> {
    const sub = await this.prisma.subscription.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        lemonSqueezyId: data.lemonSqueezyId,
        customerId: data.customerId,
        variantId: data.variantId,
        status: data.status as SubscriptionStatus,
        renewsAt: data.renewsAt,
        endsAt: data.endsAt,
      },
    });
    return sub as SubscriptionEntity;
  }

  async update(id: string, data: Partial<SubscriptionEntity>): Promise<void> {
    await this.prisma.subscription.update({
      where: { id },
      data: {
        lemonSqueezyId: data.lemonSqueezyId,
        customerId: data.customerId,
        variantId: data.variantId,
        status: data.status as SubscriptionStatus | undefined,
        renewsAt: data.renewsAt,
        endsAt: data.endsAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.subscription.delete({ where: { id } });
  }
}
