"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const uuid_1 = require("uuid");
class User {
    id;
    email;
    passwordHash;
    firstName;
    lastName;
    role;
    isActive;
    organizationId;
    createdAt;
    updatedAt;
    constructor(props) {
        this.id = props.id;
        this.email = props.email;
        this.passwordHash = props.passwordHash;
        this.firstName = props.firstName;
        this.lastName = props.lastName;
        this.role = props.role;
        this.isActive = props.isActive;
        this.organizationId = props.organizationId;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }
    static create(props) {
        const now = new Date();
        return new User({
            ...props,
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
        });
    }
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
    isAdmin() {
        return this.role === 'ADMIN';
    }
}
exports.User = User;
//# sourceMappingURL=user.entity.js.map