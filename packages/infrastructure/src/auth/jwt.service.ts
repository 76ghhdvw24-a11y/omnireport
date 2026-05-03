import jwt from 'jsonwebtoken';
import { JWTPayload, TokenPair } from '@omnireport/shared';

export interface JWTConfig {
  secret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  issuer: string;
}

export class JWTService {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = config;
  }

  generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss'>): TokenPair {
    const now = Math.floor(Date.now() / 1000);

    const accessToken = jwt.sign(
      {
        ...payload,
        iat: now,
        exp: now + this.parseExpiration(this.config.accessTokenExpiresIn),
      },
      this.config.secret,
      { issuer: this.config.issuer }
    );

    const refreshToken = jwt.sign(
      {
        sub: payload.sub,
        type: 'refresh',
        iat: now,
        exp: now + this.parseExpiration(this.config.refreshTokenExpiresIn),
      },
      this.config.secret,
      { issuer: this.config.issuer }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiration(this.config.accessTokenExpiresIn),
    };
  }

  verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, this.config.secret) as JWTPayload;
  }

  verifyRefreshToken(token: string): { sub: string; type: string } {
    return jwt.verify(token, this.config.secret) as {
      sub: string;
      type: string;
    };
  }

  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        throw new Error(`Invalid expiration format: ${expiration}`);
    }
  }
}
