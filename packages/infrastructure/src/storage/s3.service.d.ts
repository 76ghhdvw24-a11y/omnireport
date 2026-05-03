export interface S3Config {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
}
export interface PresignedUrlOptions {
    key: string;
    contentType: string;
    expiresIn: number;
    contentLength?: number;
}
export declare class S3Service {
    private client;
    private config;
    constructor(config: S3Config);
    generatePresignedUploadUrl(options: PresignedUrlOptions): Promise<string>;
    generatePresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
    deleteFile(key: string): Promise<void>;
    getFileMetadata(key: string): Promise<{
        key: string;
        size: number;
        contentType: string;
        lastModified: Date;
    }>;
    generateFileKey(organizationId: string, reportId: string, type: 'image' | 'audio', index: number, extension: string): string;
}
//# sourceMappingURL=s3.service.d.ts.map