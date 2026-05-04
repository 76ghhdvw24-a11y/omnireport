import request from 'supertest';
import { buildClientsTestApp } from './clients-test-helper';

describe('Reports API Integration', () => {
  const { app, prisma } = buildClientsTestApp();
  const suffix = Date.now().toString(36);
  let authToken = '';
  let userId = '';
  let orgId = '';

  beforeAll(async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-reports-${suffix}@example.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        organizationName: `Test Org Reports ${suffix}`,
      });

    authToken = registerRes.body.accessToken;
    userId = registerRes.body.user.id;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    orgId = meRes.body.user.organizationId;
  });

  afterAll(async () => {
    try {
      await prisma.report.deleteMany({ where: { organizationId: orgId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.organization.deleteMany({ where: { id: orgId } });
    } catch (e) {
      // ignore
    }
    await prisma.$disconnect();
  });

  describe('POST /api/v1/reports', () => {
    it('should create a report', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Report', description: 'A test report' })
        .expect(201);

      expect(res.body.title).toBe('Test Report');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.organizationId).toBe(orgId);
    });

    it('should reject missing title', async () => {
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/reports', () => {
    it('should list reports for the organization', async () => {
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Report A' });

      const res = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/reports/:id', () => {
    it('should get report details', async () => {
      const createRes = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Report Detail Test' });

      const reportId = createRes.body.id;

      const res = await request(app)
        .get(`/api/v1/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(reportId);
      expect(res.body.title).toBe('Report Detail Test');
    });

    it('should reject non-existent report', async () => {
      await request(app)
        .get('/api/v1/reports/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/reports/:id', () => {
    it('should update report title', async () => {
      const createRes = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Report To Update' });

      const reportId = createRes.body.id;

      const res = await request(app)
        .patch(`/api/v1/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/v1/reports/:id', () => {
    it('should delete a report', async () => {
      const createRes = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Report To Delete' });

      const reportId = createRes.body.id;

      await request(app)
        .delete(`/api/v1/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
