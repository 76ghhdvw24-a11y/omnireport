import PDFDocument from 'pdfkit';
import { Report, Finding } from '@omnireport/shared';

export interface PDFGeneratorConfig {
  title?: string;
  fontSize?: number;
  margin?: number;
}

export class PDFGeneratorService {
  private config: Required<PDFGeneratorConfig>;

  constructor(config: PDFGeneratorConfig = {}) {
    this.config = {
      title: 'OmniReport AI - Technical Report',
      fontSize: 11,
      margin: 50,
      ...config,
    };
  }

  async generateReport(report: Report): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: this.config.margin });

      doc.on('data', (chunk: unknown) => chunks.push(chunk as Buffer));
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

  private addHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
  }

  private addMetadata(doc: PDFKit.PDFDocument, report: Report): void {
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

  private addSection(doc: PDFKit.PDFDocument, title: string, content: string): void {
    doc.fontSize(14).font('Helvetica-Bold').text(title);
    doc.moveDown(0.5);
    doc.fontSize(this.config.fontSize).font('Helvetica').text(content);
    doc.moveDown(2);
  }

  private addFindings(doc: PDFKit.PDFDocument, findings: Finding[]): void {
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
