import { v4 as uuidv4 } from 'uuid';
import { SubscriptionStatus } from '@omnireport/shared';

export interface SubscriptionProps {
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

export class Subscription {
  readonly id: string;
  organizationId: string;
  lemonSqueezyId: string | null;
  customerId: string | null;
  variantId: string | null;
  status: SubscriptionStatus;
  renewsAt: Date | null;
  endsAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: SubscriptionProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.lemonSqueezyId = props.lemonSqueezyId;
    this.customerId = props.customerId;
    this.variantId = props.variantId;
    this.status = props.status;
    this.renewsAt = props.renewsAt;
    this.endsAt = props.endsAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<SubscriptionProps, 'id' | 'createdAt' | 'updatedAt'>): Subscription {
    const now = new Date();
    return new Subscription({
      ...props,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    });
  }

  updateStatus(newStatus: SubscriptionStatus): void {
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  updateLemonSqueezyId(lsId: string): void {
    this.lemonSqueezyId = lsId;
    this.updatedAt = new Date();
  }

  updateVariantId(variantId: string): void {
    this.variantId = variantId;
    this.updatedAt = new Date();
  }

  cancel(endsAt: Date): void {
    this.status = SubscriptionStatus.CANCELLED;
    this.endsAt = endsAt;
    this.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE || this.status === SubscriptionStatus.TRIALLING;
  }
}
