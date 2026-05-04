import request from 'supertest';
import { buildAuthTestApp } from './auth-test-helper';

describe('Auth API Integration', () => {
  const { app, prisma, jwtService } = buildAuthTestApp();
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];
  const testId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  afterEach(async () => {
    try {
      for (const userId of createdUserIds) {
        await prisma.user.deleteMany({ where: { id: userId } });
      }
      for (const orgId of createdOrgIds) {
        await prisma.organization.deleteMany({ where: { id: orgId } });
      }
    } catch (e) {
      console.warn('Cleanup error (ignoring):', e);
    }
    createdUserIds.length = 0;
    createdOrgIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and organization', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-register-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Register ${testId}`,
        })
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(`test-register-${testId}@example.com`);
      expect(res.body.user.firstName).toBe('Test');
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      createdUserIds.push(res.body.user.id);
      createdOrgIds.push(res.body.user.organizationId);
    });

    it('should reject duplicate email', async () => {
      const res1 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-dup-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Dup ${testId}`,
        })
        .expect(201);

      createdUserIds.push(res1.body.user.id);
      createdOrgIds.push(res1.body.user.organizationId);

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-dup-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Dup2 ${testId}`,
        })
        .expect(409);
    });

    it('should reject invalid input', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: '123' })
        .expect(400);

      expect(res.body.error).toBe('Invalid input');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-login-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Login ${testId}`,
        });

      createdUserIds.push(registerRes.body.user.id);
      createdOrgIds.push(registerRes.body.user.organizationId);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `test-login-${testId}@example.com`,
          password: 'password123',
        })
        .expect(200);

      expect(res.body.user.email).toBe(`test-login-${testId}@example.com`);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-login-bad-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Login Bad ${testId}`,
        });

      createdUserIds.push(registerRes.body.user.id);
      createdOrgIds.push(registerRes.body.user.organizationId);

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `test-login-bad-${testId}@example.com`,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `nonexistent-${testId}@example.com`,
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-me-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Me ${testId}`,
        });

      createdUserIds.push(registerRes.body.user.id);
      createdOrgIds.push(registerRes.body.user.organizationId);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
        .expect(200);

      expect(res.body.user.id).toBe(registerRes.body.user.id);
      expect(res.body.user.email).toBe(`test-me-${testId}@example.com`);
    });

    it('should reject missing token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token pair', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-refresh-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Refresh ${testId}`,
        });

      createdUserIds.push(registerRes.body.user.id);
      createdOrgIds.push(registerRes.body.user.organizationId);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: registerRes.body.refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject missing refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should reject invalid refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('should update profile fields', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-patch-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Patch ${testId}`,
        });

      createdUserIds.push(registerRes.body.user.id);
      createdOrgIds.push(registerRes.body.user.organizationId);

      const res = await request(app)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
        .send({ firstName: 'Updated', lastName: 'Name' })
        .expect(200);

      expect(res.body.user.firstName).toBe('Updated');
      expect(res.body.user.lastName).toBe('Name');
    });

    it('should change password', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-patch-pw-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Patch PW ${testId}`,
        });

      createdUserIds.push(registerRes.body.user.id);
      createdOrgIds.push(registerRes.body.user.organizationId);

      await request(app)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
        .send({ currentPassword: 'password123', newPassword: 'newpassword456' })
        .expect(200);

      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `test-patch-pw-${testId}@example.com`, password: 'newpassword456' })
        .expect(200);
    });

    it('should reject wrong current password', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test-patch-bad-${testId}@example.com`,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          organizationName: `Test Org Patch Bad ${testId}`,
        });

      createdUserIds.push(registerRes.body.user.id);
      createdOrgIds.push(registerRes.body.user.organizationId);

      await request(app)
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
        .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword456' })
        .expect(401);
    });
  });
});
