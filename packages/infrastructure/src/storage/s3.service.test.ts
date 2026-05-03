import { S3Service } from './s3.service';

describe('S3Service', () => {
  const service = new S3Service({
    region: 'us-east-1',
    bucket: 'test-bucket',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
  });

  it('should generate a consistent file key format', () => {
    const key = service.generateFileKey('org-1', 'report-1', 'image', 0, 'jpg');
    expect(key).toMatch(/^orgs\/org-1\/reports\/report-1\/image\/\d+-[a-z0-9]+-0\.jpg$/);
  });
});
