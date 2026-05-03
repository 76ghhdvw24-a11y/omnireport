import { Organization } from './organization.entity';
import { Report } from './report.entity';
import { User } from './user.entity';

describe('Organization Entity', () => {
  it('should create an organization with FREE plan defaults', () => {
    const org = Organization.create({
      name: 'Test Org',
      slug: 'test-org',
      logoUrl: null,
      plan: 'FREE',
      maxReports: 10,
      maxStorage: BigInt(1073741824),
      isActive: true,
    });

    expect(org.name).toBe('Test Org');
    expect(org.plan).toBe('FREE');
    expect(org.canCreateReport(5)).toBe(true);
    expect(org.canCreateReport(10)).toBe(false);
  });

  it('should upgrade plan to PRO', () => {
    const org = Organization.create({
      name: 'Test Org',
      slug: 'test-org',
      logoUrl: null,
      plan: 'FREE',
      maxReports: 10,
      maxStorage: BigInt(1073741824),
      isActive: true,
    });

    org.upgradePlan('PRO');
    expect(org.plan).toBe('PRO');
    expect(org.maxReports).toBe(100);
  });
});

describe('Report Entity', () => {
  it('should create a pending report', () => {
    const report = Report.create({
      title: 'Test Report',
      description: null,
      status: 'PENDING',
      severity: null,
      organizationId: 'org-1',
      userId: 'user-1',
      templateId: null,
      audioUrl: null,
      audioTranscript: null,
      imageUrls: [],
      findings: null,
      executiveSummary: null,
      recommendedAction: null,
      aiModel: null,
      aiResponseTime: null,
      metadata: null,
      tags: [],
    });

    expect(report.status).toBe('PENDING');
    expect(report.isProcessing()).toBe(true);
  });

  it('should calculate severity from findings', () => {
    const report = Report.create({
      title: 'Test Report',
      description: null,
      status: 'PENDING',
      severity: null,
      organizationId: 'org-1',
      userId: 'user-1',
      templateId: null,
      audioUrl: null,
      audioTranscript: null,
      imageUrls: [],
      findings: null,
      executiveSummary: null,
      recommendedAction: null,
      aiModel: null,
      aiResponseTime: null,
      metadata: null,
      tags: [],
    });

    report.completeWithAnalysis(
      {
        findings: [
          { description: 'Test', severity: 'HIGH', confidence: 0.9 },
          { description: 'Test 2', severity: 'MEDIUM', confidence: 0.8 },
        ],
        executiveSummary: 'Summary',
        recommendedAction: 'Action',
      },
      'gemini-1.5-pro',
      1500
    );

    expect(report.status).toBe('COMPLETED');
    expect(report.severity).toBe('HIGH');
    expect(report.isCompleted()).toBe(true);
  });
});

describe('User Entity', () => {
  it('should create a user and determine admin status', () => {
    const user = User.create({
      email: 'admin@test.com',
      passwordHash: 'hashed',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
      organizationId: 'org-1',
    });

    expect(user.fullName).toBe('Admin User');
    expect(user.isAdmin()).toBe(true);
  });
});
