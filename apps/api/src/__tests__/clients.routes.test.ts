import request from 'supertest';
import { buildClientsTestApp } from './clients-test-helper';

describe('Clients API Integration', () => {
  const { app, prisma, jwtService, passwordService, userRepo, orgRepo } = buildClientsTestApp();
  const suffix = Date.now().toString(36);
  let authToken = '';
  let orgId = '';
  let userId = '';

  beforeAll(async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-clients-${suffix}@example.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        organizationName: `Test Org Clients ${suffix}`,
      });

    authToken = registerRes.body.accessToken;
    userId = registerRes.body.user.id;
    // Get orgId from /auth/me since register response doesn't include it
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    orgId = meRes.body.user.organizationId;
  });

  afterAll(async () => {
    try {
      await prisma.report.deleteMany({ where: { organizationId: orgId } });
      await prisma.client.deleteMany({ where: { organizationId: orgId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.organization.deleteMany({ where: { id: orgId } });
    } catch (e) {
      // ignore cleanup errors
    }
    await prisma.$disconnect();
  });

  describe('POST /api/v1/clients', () => {
    it('should create a client', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Acme Corp', email: 'acme@example.com', phone: '1234567890' })
        .expect(201);

      expect(res.body.name).toBe('Acme Corp');
      expect(res.body.email).toBe('acme@example.com');
      expect(res.body.organizationId).toBe(orgId);
    });

    it('should reject invalid input', async () => {
      await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should reject unauthenticated', async () => {
      await request(app)
        .post('/api/v1/clients')
        .send({ name: 'Acme Corp' })
        .expect(401);
    });
  });

  describe('GET /api/v1/clients', () => {
    it('should list clients for the organization', async () => {
      await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Client A' });

      const res = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/v1/clients/:id', () => {
    it('should update a client', async () => {
      const createRes = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Client To Update' });

      const clientId = createRes.body.id;

      const res = await request(app)
        .patch(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Client', phone: '555-5555' })
        .expect(200);

      expect(res.body.name).toBe('Updated Client');
      expect(res.body.phone).toBe('555-5555');
    });

    it('should reject update for non-existent client', async () => {
      await request(app)
        .patch('/api/v1/clients/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/clients/:id', () => {
    it('should delete a client', async () => {
      const createRes = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Client To Delete' });

      const clientId = createRes.body.id;

      await request(app)
        .delete(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const listRes = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const found = listRes.body.items.find((c: any) => c.id === clientId);
      expect(found).toBeUndefined();
    });

    it('should reject delete for non-existent client', async () => {
      await request(app)
        .delete('/api/v1/clients/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
