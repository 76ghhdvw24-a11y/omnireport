import { JWTPayload, TokenPair } from '@omnireport/shared';
export interface JWTConfig {
    secret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    issuer: string;
}
export declare class JWTService {
    private config;
    constructor(config: JWTConfig);
    generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair;
    verifyAccessToken(token: string): JWTPayload;
    verifyRefreshToken(token: string): {
        sub: string;
        type: string;
    };
    private parseExpiration;
}
//# sourceMappingURL=jwt.service.d.ts.map