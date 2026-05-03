import { Report } from '@omnireport/shared';
export interface PDFGeneratorConfig {
    title?: string;
    fontSize?: number;
    margin?: number;
}
export declare class PDFGeneratorService {
    private config;
    constructor(config?: PDFGeneratorConfig);
    generateReport(report: Report): Promise<Buffer>;
    private addHeader;
    private addMetadata;
    private addSection;
    private addFindings;
}
//# sourceMappingURL=pdf-generator.service.d.ts.map