"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class PasswordService {
    saltRounds;
    constructor(saltRounds = 10) {
        this.saltRounds = saltRounds;
    }
    async hash(password) {
        return bcryptjs_1.default.hash(password, this.saltRounds);
    }
    async verify(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
}
exports.PasswordService = PasswordService;
//# sourceMappingURL=password.service.js.map