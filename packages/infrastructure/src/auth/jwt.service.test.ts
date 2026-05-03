import { JWTService } from './jwt.service';

describe('JWTService', () => {
  const service = new JWTService({
    secret: 'test-secret',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    issuer: 'test-issuer',
  });

  it('should generate a token pair', () => {
    const tokens = service.generateTokenPair({
      sub: 'user-123',
      email: 'test@example.com',
      orgId: 'org-456',
      role: 'ADMIN',
    });

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBe(900); // 15m = 900s
  });

  it('should verify a valid access token', () => {
    const tokens = service.generateTokenPair({
      sub: 'user-123',
      email: 'test@example.com',
      orgId: 'org-456',
      role: 'ADMIN',
    });

    const payload = service.verifyAccessToken(tokens.accessToken);
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.orgId).toBe('org-456');
    expect(payload.role).toBe('ADMIN');
  });

  it('should throw on invalid token', () => {
    expect(() => service.verifyAccessToken('invalid-token')).toThrow();
  });
});
