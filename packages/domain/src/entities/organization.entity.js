"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Organization = void 0;
const uuid_1 = require("uuid");
class Organization {
    id;
    name;
    slug;
    logoUrl;
    plan;
    maxReports;
    maxStorage;
    isActive;
    createdAt;
    updatedAt;
    constructor(props) {
        this.id = props.id;
        this.name = props.name;
        this.slug = props.slug;
        this.logoUrl = props.logoUrl;
        this.plan = props.plan;
        this.maxReports = props.maxReports;
        this.maxStorage = props.maxStorage;
        this.isActive = props.isActive;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }
    static create(props) {
        const now = new Date();
        return new Organization({
            ...props,
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
        });
    }
    upgradePlan(newPlan) {
        if (this.plan === newPlan)
            return;
        this.plan = newPlan;
        this.updatedAt = new Date();
        switch (newPlan) {
            case 'PRO':
                this.maxReports = 100;
                this.maxStorage = BigInt(10737418240); // 10GB
                break;
            case 'ENTERPRISE':
                this.maxReports = -1; // Unlimited
                this.maxStorage = BigInt(107374182400); // 100GB
                break;
            case 'FREE':
            default:
                this.maxReports = 10;
                this.maxStorage = BigInt(1073741824); // 1GB
                break;
        }
    }
    canCreateReport(reportCount) {
        return this.maxReports === -1 || reportCount < this.maxReports;
    }
}
exports.Organization = Organization;
//# sourceMappingURL=organization.entity.js.map