import { Finding } from '@omnireport/shared';

const extractS3Key = (url: string): string => {
  return decodeURIComponent(url.replace(/^https:\/\/[^/]+\//, ''));
};

interface Analysis {
  findings?: Finding[];
  estimatedTotalCost?: number;
  executiveSummary?: string;
  recommendedAction?: string;
}

interface Report {
  taxRate?: number;
  [key: string]: unknown;
}

const calculateCosts = (
  analysis: Analysis,
  report: Report
): { subtotal: number | undefined; tax: number | undefined; total: number | undefined } => {
  let subtotal: number | undefined;
  if (analysis.findings) {
    subtotal = analysis.findings.reduce(
      (sum: number, f: Finding) => sum + (f.estimatedCost || 0) * (f.quantity || 1),
      0
    );
  }
  const taxRate = report.taxRate ?? 19;
  const tax = subtotal ? subtotal * (taxRate / 100) : undefined;
  const total = analysis.estimatedTotalCost || (subtotal && tax ? subtotal + tax : subtotal);
  return { subtotal, tax, total };
};

describe('extractS3Key', () => {
  it('should extract s3 key from normal url', () => {
    const url = 'https://omnireport-bucket.s3.amazonaws.com/reports/123/audio.mp3';
    const key = extractS3Key(url);
    expect(key).toBe('reports/123/audio.mp3');
  });

  it('should decode uri encoded characters', () => {
    const url = 'https://omnireport-bucket.s3.amazonaws.com/reports/123/My%20File%20Name.mp3';
    const key = extractS3Key(url);
    expect(key).toBe('reports/123/My File Name.mp3');
  });

  it('should handle url with plus signs (spaces)', () => {
    const url = 'https://bucket.s3.amazonaws.com/path+with+spaces/file.jpg';
    const key = extractS3Key(url);
    expect(key).toBe('path+with+spaces/file.jpg');
  });

  it('should handle url with special characters', () => {
    const url = 'https://bucket.s3.amazonaws.com/reports/123/inspectión%20photo%20%281%29.jpg';
    const key = extractS3Key(url);
    expect(key).toBe('reports/123/inspectión photo (1).jpg');
  });

  it('should handle simple filename', () => {
    const url = 'https://bucket.s3.amazonaws.com/image.jpg';
    const key = extractS3Key(url);
    expect(key).toBe('image.jpg');
  });

  it('should handle nested paths', () => {
    const url = 'https://bucket.s3.amazonaws.com/a/b/c/d/file.mp3';
    const key = extractS3Key(url);
    expect(key).toBe('a/b/c/d/file.mp3');
  });

  it('should handle URL without path after domain', () => {
    const url = 'https://bucket.s3.amazonaws.com/';
    const key = extractS3Key(url);
    expect(key).toBe('');
  });

  it('should preserve query parameters in key', () => {
    const url = 'https://bucket.s3.amazonaws.com/path/to/file.jpg?X-Amz-Signature=abc';
    const key = extractS3Key(url);
    expect(key).toBe('path/to/file.jpg?X-Amz-Signature=abc');
  });
});

describe('calculateCosts', () => {
  it('should calculate subtotal from findings', () => {
    const analysis: Analysis = {
      findings: [
        { description: 'Fix A', severity: 'HIGH', estimatedCost: 100, quantity: 2, confidence: 0.9 },
        { description: 'Fix B', severity: 'LOW', estimatedCost: 50, quantity: 1, confidence: 0.8 },
      ],
    };
    const report: Report = { taxRate: 19 };

    const result = calculateCosts(analysis, report);

    expect(result.subtotal).toBe(250);
    expect(result.tax).toBe(47.5);
    expect(result.total).toBe(297.5);
  });

  it('should use default tax rate of 19 when not specified', () => {
    const analysis: Analysis = {
      findings: [{ description: 'Fix', severity: 'HIGH', estimatedCost: 100, quantity: 1, confidence: 0.9 }],
    };
    const report: Report = {};

    const result = calculateCosts(analysis, report);

    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(19);
    expect(result.total).toBe(119);
  });

  it('should use estimatedTotalCost when no findings', () => {
    const analysis: Analysis = {
      estimatedTotalCost: 500,
    };
    const report: Report = { taxRate: 10 };

    const result = calculateCosts(analysis, report);

    expect(result.subtotal).toBeUndefined();
    expect(result.tax).toBeUndefined();
    expect(result.total).toBe(500);
  });

  it('should handle empty findings array', () => {
    const analysis: Analysis = {
      findings: [],
    };
    const report: Report = { taxRate: 19 };

    const result = calculateCosts(analysis, report);

    expect(result.subtotal).toBe(0);
    expect(result.tax).toBeUndefined();
    expect(result.total).toBe(0);
  });

  it('should handle findings with missing estimatedCost', () => {
    const analysis: Analysis = {
      findings: [
        { description: 'Fix A', severity: 'HIGH', confidence: 0.9 },
        { description: 'Fix B', severity: 'LOW', estimatedCost: 50, confidence: 0.8 },
      ],
    };
    const report: Report = { taxRate: 19 };

    const result = calculateCosts(analysis, report);

    expect(result.subtotal).toBe(50);
    expect(result.tax).toBe(9.5);
    expect(result.total).toBe(59.5);
  });

  it('should handle findings with missing quantity', () => {
    const analysis: Analysis = {
      findings: [
        { description: 'Fix', severity: 'HIGH', estimatedCost: 100, confidence: 0.9 },
      ],
    };
    const report: Report = { taxRate: 10 };

    const result = calculateCosts(analysis, report);

    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(10);
    expect(result.total).toBe(110);
  });

  it('should use custom tax rate from report', () => {
    const analysis: Analysis = {
      findings: [{ description: 'Fix', severity: 'HIGH', estimatedCost: 200, confidence: 0.9 }],
    };
    const report: Report = { taxRate: 21 };

    const result = calculateCosts(analysis, report);

    expect(result.subtotal).toBe(200);
    expect(result.tax).toBe(42);
    expect(result.total).toBe(242);
  });

  it('should prioritize estimatedTotalCost over calculated total', () => {
    const analysis: Analysis = {
      findings: [{ description: 'Fix', severity: 'HIGH', estimatedCost: 100, confidence: 0.9 }],
      estimatedTotalCost: 1000,
    };
    const report: Report = { taxRate: 19 };

    const result = calculateCosts(analysis, report);

    expect(result.total).toBe(1000);
  });

  it('should handle decimal costs', () => {
    const analysis: Analysis = {
      findings: [
        { description: 'Fix', severity: 'HIGH', estimatedCost: 99.99, quantity: 3, confidence: 0.9 },
      ],
    };
    const report: Report = { taxRate: 19 };

    const result = calculateCosts(analysis, report);

    expect(result.subtotal).toBeCloseTo(299.97);
    expect(result.tax).toBeCloseTo(56.9943);
    expect(result.total).toBeCloseTo(356.9643);
  });
});