"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFGeneratorService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
class PDFGeneratorService {
    config;
    constructor(config = {}) {
        this.config = {
            title: 'OmniReport AI - Technical Report',
            fontSize: 11,
            margin: 50,
            ...config,
        };
    }
    async generateReport(report) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const doc = new pdfkit_1.default({ margin: this.config.margin });
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            this.addHeader(doc, report.title);
            this.addMetadata(doc, report);
            if (report.executiveSummary) {
                this.addSection(doc, 'Executive Summary', report.executiveSummary);
            }
            if (report.findings && report.findings.length > 0) {
                this.addFindings(doc, report.findings);
            }
            if (report.recommendedAction) {
                this.addSection(doc, 'Recommended Actions', report.recommendedAction);
            }
            if (report.audioTranscript) {
                this.addSection(doc, 'Audio Transcript', report.audioTranscript);
            }
            doc.end();
        });
    }
    addHeader(doc, title) {
        doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);
    }
    addMetadata(doc, report) {
        doc.fontSize(12).font('Helvetica-Bold').text('Report Information');
        doc.fontSize(this.config.fontSize).font('Helvetica');
        const metadata = [
            ['Status', report.status],
            ['Severity', report.severity || 'N/A'],
            ['Created', new Date(report.createdAt).toLocaleString()],
            ['Completed', report.completedAt ? new Date(report.completedAt).toLocaleString() : 'N/A'],
        ];
        metadata.forEach(([label, value]) => {
            doc.text(`${label}: ${value}`);
        });
        doc.moveDown(2);
    }
    addSection(doc, title, content) {
        doc.fontSize(14).font('Helvetica-Bold').text(title);
        doc.moveDown(0.5);
        doc.fontSize(this.config.fontSize).font('Helvetica').text(content);
        doc.moveDown(2);
    }
    addFindings(doc, findings) {
        doc.fontSize(14).font('Helvetica-Bold').text('Findings');
        doc.moveDown(0.5);
        findings.forEach((finding, index) => {
            const y = doc.y;
            doc.fontSize(this.config.fontSize + 1).font('Helvetica-Bold')
                .text(`${index + 1}. ${finding.description}`)
                .moveDown(0.3);
            doc.fontSize(this.config.fontSize).font('Helvetica')
                .text(`Severity: ${finding.severity}`)
                .text(`Confidence: ${(finding.confidence * 100).toFixed(0)}%`);
            if (finding.component) {
                doc.text(`Component: ${finding.component}`);
            }
            if (finding.condition) {
                doc.text(`Condition: ${finding.condition}`);
            }
            if (finding.estimatedCost !== undefined) {
                doc.text(`Estimated Cost: $${finding.estimatedCost.toFixed(2)}`);
            }
            doc.moveDown(1);
            if (y > 700) {
                doc.addPage();
            }
        });
        doc.moveDown(1);
    }
}
exports.PDFGeneratorService = PDFGeneratorService;
//# sourceMappingURL=pdf-generator.service.js.map