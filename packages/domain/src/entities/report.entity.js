"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
const uuid_1 = require("uuid");
class Report {
    id;
    title;
    description;
    status;
    severity;
    organizationId;
    userId;
    templateId;
    audioUrl;
    audioTranscript;
    imageUrls;
    findings;
    executiveSummary;
    recommendedAction;
    aiModel;
    aiResponseTime;
    metadata;
    tags;
    createdAt;
    updatedAt;
    completedAt;
    constructor(props) {
        this.id = props.id;
        this.title = props.title;
        this.description = props.description;
        this.status = props.status;
        this.severity = props.severity;
        this.organizationId = props.organizationId;
        this.userId = props.userId;
        this.templateId = props.templateId;
        this.audioUrl = props.audioUrl;
        this.audioTranscript = props.audioTranscript;
        this.imageUrls = props.imageUrls;
        this.findings = props.findings;
        this.executiveSummary = props.executiveSummary;
        this.recommendedAction = props.recommendedAction;
        this.aiModel = props.aiModel;
        this.aiResponseTime = props.aiResponseTime;
        this.metadata = props.metadata;
        this.tags = props.tags;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
        this.completedAt = props.completedAt;
    }
    static create(props) {
        const now = new Date();
        return new Report({
            ...props,
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
            completedAt: null,
        });
    }
    startProcessing() {
        this.status = 'PROCESSING';
        this.updatedAt = new Date();
    }
    setTranscribing() {
        this.status = 'TRANSCRIBING';
        this.updatedAt = new Date();
    }
    setAnalyzing() {
        this.status = 'ANALYZING';
        this.updatedAt = new Date();
    }
    completeWithAnalysis(analysis, aiModel, responseTime) {
        this.status = 'COMPLETED';
        this.findings = analysis.findings;
        this.executiveSummary = analysis.executiveSummary;
        this.recommendedAction = analysis.recommendedAction;
        this.severity = this.calculateSeverity(analysis.findings);
        this.aiModel = aiModel;
        this.aiResponseTime = responseTime;
        this.updatedAt = new Date();
        this.completedAt = new Date();
    }
    fail() {
        this.status = 'FAILED';
        this.updatedAt = new Date();
    }
    calculateSeverity(findings) {
        if (findings.length === 0)
            return 'INFO';
        const hasCritical = findings.some(f => f.severity === 'CRITICAL');
        if (hasCritical)
            return 'CRITICAL';
        const hasHigh = findings.some(f => f.severity === 'HIGH');
        if (hasHigh)
            return 'HIGH';
        const hasMedium = findings.some(f => f.severity === 'MEDIUM');
        if (hasMedium)
            return 'MEDIUM';
        const hasLow = findings.some(f => f.severity === 'LOW');
        if (hasLow)
            return 'LOW';
        return 'INFO';
    }
    isProcessing() {
        return ['PENDING', 'PROCESSING', 'TRANSCRIBING', 'ANALYZING'].includes(this.status);
    }
    isCompleted() {
        return this.status === 'COMPLETED';
    }
    isFailed() {
        return this.status === 'FAILED';
    }
}
exports.Report = Report;
//# sourceMappingURL=report.entity.js.map