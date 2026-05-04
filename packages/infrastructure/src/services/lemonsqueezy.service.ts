import { SubscriptionStatus } from '@omnireport/shared';

export interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  webhookSecret: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  checkoutId: string;
}

export interface SubscriptionData {
  id: string;
  status: string;
  variantId: number;
  customerId: number;
  renewsAt: string | null;
  endsAt: string | null;
}

export class LemonSqueezyService {
  private apiKey: string;
  private storeId: string;
  private webhookSecret: string;

  constructor(config: LemonSqueezyConfig) {
    this.apiKey = config.apiKey;
    this.storeId = config.storeId;
    this.webhookSecret = config.webhookSecret;
  }

  async createCheckout(variantId: string, organizationId: string, organizationName: string): Promise<CheckoutResult> {
    const { lemonSqueezySetup, createCheckout } = await import('@lemonsqueezy/lemonsqueezy.js');

    lemonSqueezySetup({ apiKey: this.apiKey });

    const checkout = await createCheckout(this.storeId, variantId, {
      checkoutData: {
        custom: {
          organizationId,
          organizationName,
        },
      },
    });

    if (checkout.error) {
      throw new Error(`Lemon Squeezy error: ${checkout.error.message || JSON.stringify(checkout.error)}`);
    }

    if (!checkout.data?.data?.id) {
      throw new Error('Failed to create checkout');
    }

    return {
      checkoutUrl: checkout.data.data.attributes.url,
      checkoutId: checkout.data.data.id,
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionData | null> {
    const { lemonSqueezySetup, getSubscription } = await import('@lemonsqueezy/lemonsqueezy.js');

    lemonSqueezySetup({ apiKey: this.apiKey });

    const subscription = await getSubscription(subscriptionId);

    if (!subscription.data?.data) {
      return null;
    }

    const attrs = subscription.data.data.attributes;
    return {
      id: subscription.data.data.id,
      status: attrs.status,
      variantId: attrs.variant_id,
      customerId: attrs.customer_id,
      renewsAt: attrs.renews_at,
      endsAt: attrs.ends_at,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const { lemonSqueezySetup, cancelSubscription } = await import('@lemonsqueezy/lemonsqueezy.js');

    lemonSqueezySetup({ apiKey: this.apiKey });

    await cancelSubscription(subscriptionId);
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }
}
