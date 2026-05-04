import { SubscriptionStatus } from '@omnireport/shared';

export interface SubscriptionEntity {
  id: string;
  organizationId: string;
  lemonSqueezyId: string | null;
  customerId: string | null;
  variantId: string | null;
  status: SubscriptionStatus;
  renewsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionRepository {
  findById(id: string): Promise<SubscriptionEntity | null>;
  findByOrganizationId(orgId: string): Promise<SubscriptionEntity | null>;
  findByLemonSqueezyId(lsId: string): Promise<SubscriptionEntity | null>;
  create(data: Omit<SubscriptionEntity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<SubscriptionEntity>;
  update(id: string, data: Partial<SubscriptionEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}
