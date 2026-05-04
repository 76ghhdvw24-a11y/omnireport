import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PrismaSubscriptionRepository, LemonSqueezyService, logger } from '@omnireport/infrastructure';
import { CreateCheckoutUseCase, CancelSubscriptionUseCase } from '@omnireport/use-cases';

const checkoutSchema = z.object({
  variantId: z.string().min(1),
});

export function createSubscriptionsRoutes(
  prisma: PrismaClient,
  lemonSqueezyService: LemonSqueezyService
): Router {
  const router = Router();
  const subscriptionRepo = new PrismaSubscriptionRepository(prisma);

  router.post('/checkout', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = checkoutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: 'Invalid input', details: result.error.flatten() });
      }

      const { variantId } = result.data;

      const org = await prisma.organization.findUnique({ where: { id: req.orgId } });
      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const createCheckoutUseCase = new CreateCheckoutUseCase({ lemonSqueezyService });

      const checkout = await createCheckoutUseCase.execute({
        variantId,
        organizationId: req.orgId,
        organizationName: org.name,
      });

      res.json(checkout);
    } catch (error: any) {
      logger.error({ err: error }, 'Error creating checkout');
      res.status(500).json({ error: error.message || 'Failed to create checkout' });
    }
  });

  router.get('/:organizationId', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { organizationId } = req.params;

      if (organizationId !== req.orgId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const subscription = await subscriptionRepo.findByOrganizationId(organizationId);

      if (!subscription) {
        return res.json({ subscription: null });
      }

      const org = await prisma.organization.findUnique({ where: { id: organizationId } });

      res.json({
        subscription: {
          id: subscription.id,
          status: subscription.status,
          variantId: subscription.variantId,
          renewsAt: subscription.renewsAt,
          endsAt: subscription.endsAt,
          lemonSqueezyId: subscription.lemonSqueezyId,
        },
        organization: org ? {
          plan: org.plan,
          maxReports: org.maxReports,
        } : null,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching subscription');
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  router.post('/:subscriptionId/cancel', async (req, res) => {
    try {
      if (!req.orgId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { subscriptionId } = req.params;

      const cancelSubscriptionUseCase = new CancelSubscriptionUseCase({
        subscriptionRepo,
        lemonSqueezyService,
        prisma,
      });

      await cancelSubscriptionUseCase.execute(subscriptionId);

      res.json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
      logger.error({ err: error }, 'Error cancelling subscription');
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });

  return router;
}
