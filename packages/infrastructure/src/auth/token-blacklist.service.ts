import Redis from 'ioredis';

export class TokenBlacklistService {
  private redis: Redis;
  private prefix = 'revoked_token:';

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async revoke(token: string, expiresInSeconds: number): Promise<void> {
    const key = `${this.prefix}${token}`;
    await this.redis.setex(key, expiresInSeconds, '1');
  }

  async isRevoked(token: string): Promise<boolean> {
    const key = `${this.prefix}${token}`;
    const result = await this.redis.get(key);
    return result === '1';
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
