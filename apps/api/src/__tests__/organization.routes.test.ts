import request from 'supertest';
import { buildClientsTestApp } from './clients-test-helper';

describe('Organization API Integration', () => {
  const { app, prisma } = buildClientsTestApp();
  const suffix = Date.now().toString(36);
  let authToken = '';
  let userId = '';

  beforeAll(async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-org-${suffix}@example.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        organizationName: `Test Org Org ${suffix}`,
      });

    authToken = registerRes.body.accessToken;
    userId = registerRes.body.user.id;
  });

  afterAll(async () => {
    try {
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      const orgId = meRes.body.user.organizationId;
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.organization.deleteMany({ where: { id: orgId } });
    } catch (e) {
      // ignore
    }
    await prisma.$disconnect();
  });

  describe('GET /api/v1/organization', () => {
    it('should return organization data', async () => {
      const res = await request(app)
        .get('/api/v1/organization')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.name).toBeDefined();
      expect(res.body.plan).toBeDefined();
    });
  });

  describe('PATCH /api/v1/organization', () => {
    it('should update organization fields', async () => {
      const res = await request(app)
        .patch('/api/v1/organization')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ address: '123 Main St', phone: '555-1234', currency: 'USD' })
        .expect(200);

      expect(res.body.address).toBe('123 Main St');
      expect(res.body.phone).toBe('555-1234');
      expect(res.body.currency).toBe('USD');
    });

    it('should reject unauthenticated', async () => {
      await request(app)
        .patch('/api/v1/organization')
        .send({ address: '123 Main St' })
        .expect(401);
    });
  });

  describe('GET /api/v1/organization/members', () => {
    it('should list team members', async () => {
      const res = await request(app)
        .get('/api/v1/organization/members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });
});
