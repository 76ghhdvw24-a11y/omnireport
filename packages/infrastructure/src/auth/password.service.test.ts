import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('should hash a password', async () => {
    const hash = await service.hash('my-secret-password');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(20);
  });

  it('should verify a correct password', async () => {
    const password = 'my-secret-password';
    const hash = await service.hash(password);
    const isValid = await service.verify(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await service.hash('correct-password');
    const isValid = await service.verify('wrong-password', hash);
    expect(isValid).toBe(false);
  });
});
