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

const NO_DECIMAL_CURRENCIES = new Set(['CLP', 'COP', 'ARS', 'BRL', 'PEN']);
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '\u20ac', GBP: '\u00a3', MXN: 'MX$',
  COP: 'COP$', ARS: 'AR$', BRL: 'R$', PEN: 'S/', CLP: 'CLP$',
};

function cs(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency + ' ';
}

function fmt(amount: number, currency: string): string {
  if (NO_DECIMAL_CURRENCIES.has(currency)) {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export class PDFGeneratorService {
  private fs: number;
  private m: number;
  private pw: number;

  constructor(config: PDFGeneratorConfig = {}) {
    this.fs = config.fontSize || 9;
    this.m = config.margin || 50;
    this.pw = 595.28 - this.m * 2; // A4 width minus margins
  }

  async generateReport(report: Report, organization?: OrganizationInfo | null, client?: ClientInfo | null): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: this.m, size: 'A4', bufferPages: true });
      doc.on('data', (chunk: unknown) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const currency = report.currency || organization?.currency || 'USD';
      let y = this.m;

      // === HEADER ===
      y = this.drawHeader(doc, y, organization);
      y = this.drawBanner(doc, y);
      y = this.drawIdentification(doc, y, report, client);
      y = this.drawSummary(doc, y, report);
      y = this.drawItemsTable(doc, y, report, currency);
      y = this.drawCostSummary(doc, y, report, currency);
      y = this.drawPaymentTerms(doc, y, report);
      y = this.drawRecommendedAction(doc, y, report);
      y = this.drawFooter(doc, y, report, organization);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, y: number, org?: OrganizationInfo | null): number {
    // Left: org name
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#111827');
    doc.text(org?.name || 'Presupuesto', this.m, y);
    const nameH = doc.heightOfString(org?.name || 'Presupuesto', { width: this.pw * 0.5 });

    if (org) {
      doc.fontSize(this.fs).font('Helvetica').fillColor('#6b7280');
      let infoY = y + nameH + 2;
      if (org.taxId) { doc.text(org.taxId, this.m, infoY); infoY += 12; }
      if (org.address) { doc.text(org.address, this.m, infoY); infoY += 12; }
      if (org.phone) { doc.text(`Tel: ${org.phone}`, this.m, infoY); infoY += 12; }
    }

    // Line
    const headerBottom = y + 50;
    doc.moveTo(this.m, headerBottom).lineTo(this.m + this.pw, headerBottom).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    doc.fillColor('#000000');
    doc.y = headerBottom + 8;
    return doc.y;
  }

  private drawBanner(doc: PDFKit.PDFDocument, y: number): number {
    doc.rect(this.m, y, this.pw, 28).fill('#f3f4f6');
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1f2937');
    doc.text('PRESUPUESTO', this.m, y + 7, { width: this.pw, align: 'center' });
    doc.fillColor('#000000');
    doc.y = y + 36;
    return doc.y;
  }

  private drawIdentification(doc: PDFKit.PDFDocument, y: number, report: Report, client?: ClientInfo | null): number {
    const halfW = this.pw * 0.5;

    // Left column
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af');
    doc.text('PRESUPUESTO N\u00b0', this.m, y, { width: halfW });

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
    doc.text(report.title, this.m, doc.y + 2, { width: halfW });

    doc.fontSize(this.fs).font('Helvetica').fillColor('#6b7280');
    doc.text(new Date(report.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }), this.m, doc.y + 2, { width: halfW });

    // Right column - client info
    if (client) {
      const rx = this.m + halfW + 20;
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af');
      doc.text('CLIENTE', rx, y, { width: halfW - 20, align: 'right' });

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
      doc.text(client.name, rx, doc.y + 2, { width: halfW - 20, align: 'right' });

      doc.fontSize(this.fs).font('Helvetica').fillColor('#374151');
      let cy = doc.y + 2;
      if (client.taxId) { doc.text(client.taxId, rx, cy, { width: halfW - 20, align: 'right' }); cy += 12; }
      if (client.email) { doc.text(client.email, rx, cy, { width: halfW - 20, align: 'right' }); cy += 12; }
      if (client.phone) { doc.text(client.phone, rx, cy, { width: halfW - 20, align: 'right' }); cy += 12; }
    }

    // Find the max Y
    const leftEnd = doc.y + 10;
    let maxY = Math.max(leftEnd, y + 60);

    doc.y = maxY;
    doc.moveTo(this.m, doc.y).lineTo(this.m + this.pw, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    doc.y += 10;
    return doc.y;
  }

  private drawSummary(doc: PDFKit.PDFDocument, y: number, report: Report): number {
    if (!report.executiveSummary) return y;

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af');
    doc.text('RESUMEN', this.m, y);
    y = doc.y + 3;

    doc.fontSize(this.fs).font('Helvetica').fillColor('#374151');
    doc.text(report.executiveSummary, this.m, y, { width: this.pw });
    y = doc.y + 8;

    doc.moveTo(this.m, y).lineTo(this.m + this.pw, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    return y + 8;
  }

  private drawItemsTable(doc: PDFKit.PDFDocument, y: number, report: Report, currency: string): number {
    const findings = report.findings || [];
    if (findings.length === 0) return y;

    // Column widths
    const colNum = 22;
    const colQty = 32;
    const colPrice = 68;
    const colTotal = 68;
    const colDesc = this.pw - colNum - colQty - colPrice - colTotal;

    // Section title
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151');
    doc.text('ITEMS', this.m, y);
    y = doc.y + 6;

    // Table header
    const headerH = 22;
    doc.rect(this.m, y, this.pw, headerH).fill('#374151');
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');

    let x = this.m;
    doc.text('#', x + 4, y + 6, { width: colNum });
    x += colNum;
    doc.text('DESCRIPCI\u00d3N', x + 4, y + 6, { width: colDesc });
    x += colDesc;
    doc.text('CANT.', x, y + 6, { width: colQty, align: 'right' });
    x += colQty;
    doc.text('PRECIO UNIT.', x, y + 6, { width: colPrice, align: 'right' });
    x += colPrice;
    doc.text('TOTAL', x, y + 6, { width: colTotal, align: 'right' });

    y += headerH;

    // Table rows
    findings.forEach((finding, index) => {
      const qty = finding.quantity || 1;
      const lineTotal = (finding.estimatedCost || 0) * qty;
      const severityLabels: Record<string, string> = { CRITICAL: 'Cr\u00edtico', HIGH: 'Alto', MEDIUM: 'Medio', LOW: 'Bajo', INFO: 'Info' };
      const severityLabel = severityLabels[finding.severity] || finding.severity;

      // Calculate row height based on description length
      doc.fontSize(this.fs).font('Helvetica');
      const descH = doc.heightOfString(finding.description, { width: colDesc - 10 });
      const rowH = Math.max(descH + 18, 30);

      // Check page break
      if (y + rowH > 750) {
        doc.addPage();
        y = this.m;
        // Redraw header on new page
        doc.rect(this.m, y, this.pw, headerH).fill('#374151');
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
        let hx = this.m;
        doc.text('#', hx + 4, y + 6, { width: colNum }); hx += colNum;
        doc.text('DESCRIPCI\u00d3N', hx + 4, y + 6, { width: colDesc }); hx += colDesc;
        doc.text('CANT.', hx, y + 6, { width: colQty, align: 'right' }); hx += colQty;
        doc.text('PRECIO UNIT.', hx, y + 6, { width: colPrice, align: 'right' }); hx += colPrice;
        doc.text('TOTAL', hx, y + 6, { width: colTotal, align: 'right' });
        y += headerH;
      }

      // Row background
      const rowBg = index % 2 === 0 ? '#fafafa' : '#ffffff';
      doc.rect(this.m, y, this.pw, rowH).fill(rowBg);

      // Row border bottom
      doc.moveTo(this.m, y + rowH).lineTo(this.m + this.pw, y + rowH).strokeColor('#e5e7eb').lineWidth(0.3).stroke();

      // Row content
      doc.fontSize(this.fs).fillColor('#374151');
      x = this.m;

      // #
      doc.font('Helvetica').text(String(index + 1), x + 4, y + 8, { width: colNum });
      x += colNum;

      // Description
      doc.font('Helvetica').text(finding.description, x + 4, y + 4, { width: colDesc - 10 });
      doc.fontSize(7).font('Helvetica').fillColor('#9ca3af');
      doc.text(severityLabel, x + 4, y + rowH - 12, { width: colDesc - 10 });
      x += colDesc;

      // Quantity
      doc.fontSize(this.fs).font('Helvetica').fillColor('#374151');
      doc.text(String(qty), x, y + 8, { width: colQty, align: 'right' });
      x += colQty;

      // Price
      doc.text(fmt(finding.estimatedCost || 0, currency), x, y + 8, { width: colPrice, align: 'right' });
      x += colPrice;

      // Total
      doc.font('Helvetica-Bold').text(fmt(lineTotal, currency), x, y + 8, { width: colTotal, align: 'right' });

      y += rowH;
    });

    doc.fillColor('#000000');
    return y + 4;
  }

  private drawCostSummary(doc: PDFKit.PDFDocument, y: number, report: Report, currency: string): number {
    if (y > 660) { doc.addPage(); y = this.m; }

    const findings = report.findings || [];
    const subtotal = report.subtotal ?? findings.reduce((s, f) => s + (f.estimatedCost || 0) * (f.quantity || 1), 0);
    const taxRate = (report as any).taxRate ?? 19;
    const tax = report.tax ?? subtotal * (taxRate / 100);
    const total = report.total ?? (subtotal + tax);

    const labelW = 100;
    const valueW = 130;
    const summaryX = this.m + this.pw - labelW - valueW;
    let sy = y + 8;

    // Subtotal
    doc.fontSize(this.fs).font('Helvetica').fillColor('#6b7280');
    doc.text('Subtotal', summaryX, sy, { width: labelW });
    doc.font('Helvetica').fillColor('#111827');
    doc.text(`${cs(currency)}${fmt(subtotal, currency)}`, summaryX + labelW, sy, { width: valueW, align: 'right' });
    sy += 16;

    // IVA
    doc.fontSize(this.fs).font('Helvetica').fillColor('#6b7280');
    doc.text(`IVA (${taxRate}%)`, summaryX, sy, { width: labelW });
    doc.font('Helvetica').fillColor('#111827');
    doc.text(`${cs(currency)}${fmt(tax, currency)}`, summaryX + labelW, sy, { width: valueW, align: 'right' });
    sy += 20;

    // Line
    doc.moveTo(summaryX, sy).lineTo(summaryX + labelW + valueW, sy).strokeColor('#374151').lineWidth(1).stroke();
    doc.lineWidth(0.5);
    sy += 6;

    // Total
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827');
    doc.text('Total', summaryX, sy, { width: labelW });
    doc.text(`${cs(currency)}${fmt(total, currency)}`, summaryX + labelW, sy, { width: valueW, align: 'right' });

    doc.fillColor('#000000');
    doc.y = sy + 24;
    return doc.y;
  }

  private drawPaymentTerms(doc: PDFKit.PDFDocument, y: number, report: Report): number {
    const paymentTerms = (report as any).paymentTerms;
    if (!paymentTerms) return y;

    if (y > 700) { doc.addPage(); y = this.m; }

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af');
    doc.text('CONDICIONES DE PAGO', this.m, y);
    y = doc.y + 3;

    doc.fontSize(this.fs).font('Helvetica').fillColor('#374151');
    doc.text(paymentTerms, this.m, y, { width: this.pw });
    return doc.y + 8;
  }

  private drawRecommendedAction(doc: PDFKit.PDFDocument, y: number, report: Report): number {
    if (!report.recommendedAction) return y;

    if (y > 680) { doc.addPage(); y = this.m; }

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af');
    doc.text('ACCI\u00d3N RECOMENDADA', this.m, y);
    y = doc.y + 3;

    doc.fontSize(this.fs).font('Helvetica').fillColor('#374151');
    doc.text(report.recommendedAction, this.m, y, { width: this.pw });
    return doc.y + 8;
  }

  private drawFooter(doc: PDFKit.PDFDocument, y: number, report: Report, org?: OrganizationInfo | null): number {
    if (y > 720) { doc.addPage(); y = this.m; }

    doc.moveDown(1);
    y = doc.y;

    doc.moveTo(this.m, y).lineTo(this.m + this.pw, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 8;

    const footerText = org ? `${org.name} \u2013 Powered by OmniReport AI` : 'Powered by OmniReport AI';
    doc.fontSize(7).font('Helvetica').fillColor('#9ca3af');
    doc.text(footerText, this.m, y, { width: this.pw, align: 'center' });
    doc.text(`Presupuesto ID: ${report.id}`, this.m, doc.y, { width: this.pw, align: 'center' });

    return doc.y;
  }
}