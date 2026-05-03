import PDFDocument from 'pdfkit';
import { Report, Finding } from '@omnireport/shared';

export interface OrganizationInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
  currency?: string;
  language?: string;
}

export interface ClientInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
}

export interface PDFGeneratorConfig {
  title?: string;
  fontSize?: number;
  margin?: number;
}

const es: Record<string, string> = {
  Presupuesto: 'Presupuesto',
  InformacionDelPresupuesto: 'Información del Presupuesto',
  De: 'De',
  Cliente: 'Cliente',
  Estado: 'Estado',
  Severidad: 'Severidad',
  Creado: 'Creado',
  Completado: 'Completado',
  ResumenEjecutivo: 'Resumen Ejecutivo',
  Hallazgos: 'Hallazgos',
  SeveridadCRITICAL: 'Crítico',
  SeveridadHIGH: 'Alto',
  SeveridadMEDIUM: 'Medio',
  SeveridadLOW: 'Bajo',
  SeveridadINFO: 'Informativo',
  Confianza: 'Confianza',
  Componente: 'Componente',
  CostoEstimado: 'Costo Estimado',
  AccionRecomendada: 'Acción Recomendada',
  TranscripcionDeAudio: 'Transcripción de Audio',
  Subtotal: 'Subtotal',
  Impuestos: 'Impuestos',
  Total: 'Total',
  NoAplica: 'N/A',
  Generado: 'Generado',
  PresupuestoID: 'ID de Presupuesto',
  PoweredBy: 'Powered by OmniReport AI',
  Condicion: 'Condición',
};

export class PDFGeneratorService {
  private config: Required<PDFGeneratorConfig>;

  constructor(config: PDFGeneratorConfig = {}) {
    this.config = { title: 'Presupuesto', fontSize: 11, margin: 50, ...config };
  }

  async generateReport(report: Report, organization?: OrganizationInfo | null, client?: ClientInfo | null): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: this.config.margin });
      doc.on('data', (chunk: unknown) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const currency = report.currency || organization?.currency || 'USD';
      const currencySymbol = this.getCurrencySymbol(currency);

      this.addHeader(doc, report.title);
      this.addReportInfo(doc, report, organization, client);

      if (report.executiveSummary) {
        this.addSection(doc, es.ResumenEjecutivo, report.executiveSummary);
      }

      if (report.findings && report.findings.length > 0) {
        this.addFindings(doc, report.findings, currencySymbol);
      }

      if (report.recommendedAction) {
        this.addSection(doc, es.AccionRecomendada, report.recommendedAction);
      }

      if (report.subtotal !== null && report.subtotal !== undefined) {
        this.addCostSummary(doc, report, currencySymbol);
      }

      if (report.audioTranscript) {
        this.addSection(doc, es.TranscripcionDeAudio, report.audioTranscript);
      }

      this.addFooter(doc, report, organization);
      doc.end();
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`${es.Presupuesto} - ${es.Generado}: ${new Date().toLocaleString('es-ES')}`, { align: 'center' });
    doc.moveDown(2);
  }

  private addReportInfo(doc: PDFKit.PDFDocument, report: Report, organization?: OrganizationInfo | null, client?: ClientInfo | null): void {
    doc.fontSize(14).font('Helvetica-Bold').text(es.InformacionDelPresupuesto);
    doc.moveDown(0.5);

    if (organization) {
      doc.fontSize(this.config.fontSize).font('Helvetica-Bold').text(`${es.De}:`, { continued: true });
      doc.font('Helvetica').text(` ${organization.name}`);
      if (organization.address) doc.text(`  ${organization.address}`);
      if (organization.phone) doc.text(`  Tel: ${organization.phone}`);
      if (organization.taxId) doc.text(`  RUC/NIT: ${organization.taxId}`);
      doc.moveDown(0.5);
    }

    if (client) {
      doc.fontSize(this.config.fontSize).font('Helvetica-Bold').text(`${es.Cliente}:`, { continued: true });
      doc.font('Helvetica').text(` ${client.name}`);
      if (client.email) doc.text(`  ${client.email}`);
      if (client.phone) doc.text(`  Tel: ${client.phone}`);
      if (client.address) doc.text(`  ${client.address}`);
      if (client.taxId) doc.text(`  RUC/NIT: ${client.taxId}`);
      doc.moveDown(0.5);
    }

    const statusText = report.status === 'APPROVED' ? 'Aprobado' : report.status === 'DRAFT' ? 'Borrador' : report.status;
    const severityText = report.severity ? (es[`Severidad${report.severity}` as keyof typeof es] || report.severity) : es.NoAplica;

    const metadata = [
      [es.Estado, statusText],
      [es.Severidad, severityText],
      [es.Creado, new Date(report.createdAt).toLocaleString('es-ES')],
      [es.Completado, report.completedAt ? new Date(report.completedAt).toLocaleString('es-ES') : es.NoAplica],
    ];

    doc.fontSize(this.config.fontSize).font('Helvetica');
    metadata.forEach(([label, value]) => { doc.text(`${label}: ${value}`); });
    doc.moveDown(2);
  }

  private addSection(doc: PDFKit.PDFDocument, title: string, content: string): void {
    doc.fontSize(14).font('Helvetica-Bold').text(title);
    doc.moveDown(0.5);
    doc.fontSize(this.config.fontSize).font('Helvetica').text(content);
    doc.moveDown(2);
  }

  private addFindings(doc: PDFKit.PDFDocument, findings: Finding[], currencySymbol: string): void {
    doc.fontSize(14).font('Helvetica-Bold').text(es.Hallazgos);
    doc.moveDown(0.5);

    findings.forEach((finding, index) => {
      if (doc.y > 700) doc.addPage();

      doc.fontSize(this.config.fontSize + 1).font('Helvetica-Bold')
        .text(`${index + 1}. ${finding.description}`)
        .moveDown(0.3);

      doc.fontSize(this.config.fontSize).font('Helvetica');
      const severityLabel = es[`Severidad${finding.severity}` as keyof typeof es] || finding.severity;
      doc.text(`${es.Severidad}: ${severityLabel}`);
      doc.text(`${es.Confianza}: ${(finding.confidence * 100).toFixed(0)}%`);

      if (finding.component) doc.text(`${es.Componente}: ${finding.component}`);
      if (finding.condition) doc.text(`${es.Condicion}: ${finding.condition}`);
      if (finding.estimatedCost !== undefined && finding.estimatedCost !== null) {
        doc.text(`${es.CostoEstimado}: ${currencySymbol}${finding.estimatedCost.toFixed(2)}`);
      }

      doc.moveDown(1);
    });

    doc.moveDown(1);
  }

  private addCostSummary(doc: PDFKit.PDFDocument, report: Report, currencySymbol: string): void {
    if (doc.y > 650) doc.addPage();

    doc.fontSize(14).font('Helvetica-Bold').text(es.ResumenEjecutivo).moveDown(0.3);
    doc.fontSize(this.config.fontSize).font('Helvetica');
    if (report.subtotal !== null && report.subtotal !== undefined) {
      doc.text(`${es.Subtotal}: ${currencySymbol}${report.subtotal.toFixed(2)}`);
    }
    if (report.tax !== null && report.tax !== undefined) {
      doc.text(`${es.Impuestos}: ${currencySymbol}${report.tax.toFixed(2)}`);
    }
    if (report.total !== null && report.total !== undefined) {
      doc.font('Helvetica-Bold').text(`${es.Total}: ${currencySymbol}${report.total.toFixed(2)}`);
    }
    doc.moveDown(2);
  }

  private addFooter(doc: PDFKit.PDFDocument, report: Report, organization?: OrganizationInfo | null): void {
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text(`${es.PresupuestoID}: ${report.id}`, { align: 'center' });
    const footerText = organization ? `${organization.name} - ${es.PoweredBy}` : es.PoweredBy;
    doc.text(footerText, { align: 'center' });
  }

  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', MXN: 'MX$', COP: 'COP$', ARS: 'AR$', BRL: 'R$', PEN: 'S/', CLP: 'CLP$' };
    return symbols[currency] || currency + ' ';
  }
}