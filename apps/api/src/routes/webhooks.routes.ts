import { Router, raw } from 'express';
import { LemonSqueezyService, PrismaSubscriptionRepository, logger } from '@omnireport/infrastructure';
import { UpdateSubscriptionStatusUseCase } from '@omnireport/use-cases';
import { PrismaClient } from '@prisma/client';

export function createWebhooksRoutes(prisma: PrismaClient, lemonSqueezyService: LemonSqueezyService): Router {
  const router = Router();
  const subscriptionRepo = new PrismaSubscriptionRepository(prisma);

  const updateSubscriptionStatusUseCase = new UpdateSubscriptionStatusUseCase({
    subscriptionRepo,
    prisma,
  });

  router.post('/lemonsqueezy', raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-signature'] as string;

      if (!signature) {
        logger.warn('Webhook request missing signature');
        return res.status(401).json({ error: 'Missing signature' });
      }

      const payload = JSON.stringify(req.body);

      if (!lemonSqueezyService.verifyWebhookSignature(payload, signature)) {
        logger.warn('Webhook request with invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const eventName = req.body.meta?.event_name;

      if (!eventName) {
        return res.status(400).json({ error: 'Missing event name' });
      }

      logger.info({ eventName }, 'Received Lemon Squeezy webhook');

      switch (eventName) {
        case 'subscription_created':
        case 'subscription_updated':
        case 'subscription_cancelled':
        case 'subscription_expired': {
          const subscriptionData = req.body.data?.attributes;
          const variantId = subscriptionData?.variant_id;
          const customerId = subscriptionData?.customer_id;
          const status = subscriptionData?.status;

          const customData = req.body.meta && req.body.meta.custom_data;
          const organizationId = customData?.organizationId;

          if (!organizationId) {
            logger.error('Webhook missing organizationId in custom_data');
            return res.status(400).json({ error: 'Missing organizationId' });
          }

          await updateSubscriptionStatusUseCase.execute({
            eventName,
            data: {
              id: req.body.data?.id,
              status,
              variantId,
              customerId,
              renewsAt: subscriptionData.renews_at,
              endsAt: subscriptionData.ends_at,
              organizationId,
            },
          });
          break;
        }
        case 'order_created': {
          logger.info({ orderId: req.body.data?.id }, 'Order created webhook received');
          break;
        }
        default:
          logger.info({ eventName }, 'Unhandled webhook event');
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error({ err: error }, 'Error processing webhook');
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}
