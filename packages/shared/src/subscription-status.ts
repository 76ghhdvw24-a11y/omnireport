export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALLING = 'TRIALLING',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export function mapLemonSqueezyStatus(lsStatus: string): SubscriptionStatus {
  switch (lsStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'trialling':
      return SubscriptionStatus.TRIALLING;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'cancelled':
      return SubscriptionStatus.CANCELLED;
    case 'expired':
      return SubscriptionStatus.EXPIRED;
    default:
      return SubscriptionStatus.ACTIVE;
  }
}

export function isActiveSubscription(status: SubscriptionStatus): boolean {
  return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALLING;
}
