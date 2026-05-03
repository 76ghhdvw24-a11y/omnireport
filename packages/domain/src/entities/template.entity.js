"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Template = void 0;
const uuid_1 = require("uuid");
class Template {
    id;
    name;
    description;
    industry;
    systemPrompt;
    outputFormat;
    isActive;
    organizationId;
    createdAt;
    updatedAt;
    constructor(props) {
        this.id = props.id;
        this.name = props.name;
        this.description = props.description;
        this.industry = props.industry;
        this.systemPrompt = props.systemPrompt;
        this.outputFormat = props.outputFormat;
        this.isActive = props.isActive;
        this.organizationId = props.organizationId;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }
    static create(props) {
        const now = new Date();
        return new Template({
            ...props,
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
        });
    }
    activate() {
        this.isActive = true;
        this.updatedAt = new Date();
    }
    deactivate() {
        this.isActive = false;
        this.updatedAt = new Date();
    }
    isGlobal() {
        return this.organizationId === null;
    }
}
exports.Template = Template;
//# sourceMappingURL=template.entity.js.map