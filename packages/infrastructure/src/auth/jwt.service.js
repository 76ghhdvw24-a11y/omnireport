"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JWTService {
    config;
    constructor(config) {
        this.config = config;
    }
    generateTokenPair(payload) {
        const now = Math.floor(Date.now() / 1000);
        const accessToken = jsonwebtoken_1.default.sign({
            ...payload,
            iat: now,
            exp: now + this.parseExpiration(this.config.accessTokenExpiresIn),
        }, this.config.secret, { issuer: this.config.issuer });
        const refreshToken = jsonwebtoken_1.default.sign({
            sub: payload.sub,
            type: 'refresh',
            iat: now,
            exp: now + this.parseExpiration(this.config.refreshTokenExpiresIn),
        }, this.config.secret, { issuer: this.config.issuer });
        return {
            accessToken,
            refreshToken,
            expiresIn: this.parseExpiration(this.config.accessTokenExpiresIn),
        };
    }
    verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, this.config.secret);
    }
    verifyRefreshToken(token) {
        return jsonwebtoken_1.default.verify(token, this.config.secret);
    }
    parseExpiration(expiration) {
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
exports.JWTService = JWTService;
//# sourceMappingURL=jwt.service.js.map