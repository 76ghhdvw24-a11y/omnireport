'use server';

import { api } from '@/lib/api';

export async function createCheckoutAction(variantId: string) {
  try {
    const res = await api.post('/api/v1/subscriptions/checkout', {
      variantId,
    });
    return { success: true, checkoutUrl: res.data.checkoutUrl };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.error || 'Failed to create checkout' };
  }
}
