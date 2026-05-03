import { S3Service } from '@omnireport/infrastructure';
export interface ProcessMediaUseCaseDeps {
    s3Service: S3Service;
}
export interface MediaUploadResult {
    uploadUrl: string;
    key: string;
}
export declare class ProcessMediaUseCase {
    private s3Service;
    constructor(deps: ProcessMediaUseCaseDeps);
    generateUploadUrl(organizationId: string, reportId: string, type: 'image' | 'audio', index: number, contentType: string): Promise<MediaUploadResult>;
    deleteFile(key: string): Promise<void>;
    private getExtensionFromContentType;
}
//# sourceMappingURL=process-media.use-case.d.ts.map