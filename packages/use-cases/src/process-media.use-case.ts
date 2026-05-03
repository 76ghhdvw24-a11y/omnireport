import { S3Service } from '@omnireport/infrastructure';

export interface ProcessMediaUseCaseDeps {
  s3Service: S3Service;
}

export interface MediaUploadResult {
  uploadUrl: string;
  key: string;
}

export class ProcessMediaUseCase {
  private s3Service: S3Service;

  constructor(deps: ProcessMediaUseCaseDeps) {
    this.s3Service = deps.s3Service;
  }

  async generateUploadUrl(
    organizationId: string,
    reportId: string,
    type: 'image' | 'audio',
    index: number,
    contentType: string
  ): Promise<MediaUploadResult> {
    const extension = this.getExtensionFromContentType(contentType);
    const key = this.s3Service.generateFileKey(
      organizationId,
      reportId,
      type,
      index,
      extension
    );

    const uploadUrl = await this.s3Service.generatePresignedUploadUrl({
      key,
      contentType,
      expiresIn: 3600,
    });

    return {
      uploadUrl,
      key,
    };
  }

  async deleteFile(key: string): Promise<void> {
    return this.s3Service.deleteFile(key);
  }

  private getExtensionFromContentType(contentType: string): string {
    const mapping: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'audio/aac': 'aac',
    };

    return mapping[contentType] || 'bin';
  }
}
