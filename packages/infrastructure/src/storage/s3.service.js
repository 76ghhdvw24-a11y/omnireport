"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
class S3Service {
    client;
    config;
    constructor(config) {
        this.config = config;
        this.client = new client_s3_1.S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            endpoint: config.endpoint,
        });
    }
    async generatePresignedUploadUrl(options) {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.config.bucket,
            Key: options.key,
            ContentType: options.contentType,
            ContentLength: options.contentLength,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn: options.expiresIn });
    }
    async generatePresignedDownloadUrl(key, expiresIn = 3600) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn });
    }
    async deleteFile(key) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
        });
        await this.client.send(command);
    }
    async getFileMetadata(key) {
        const command = new client_s3_1.HeadObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
        });
        const response = await this.client.send(command);
        return {
            key,
            size: response.ContentLength || 0,
            contentType: response.ContentType || 'application/octet-stream',
            lastModified: response.LastModified || new Date(),
        };
    }
    generateFileKey(organizationId, reportId, type, index, extension) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `orgs/${organizationId}/reports/${reportId}/${type}/${timestamp}-${random}-${index}.${extension}`;
    }
}
exports.S3Service = S3Service;
//# sourceMappingURL=s3.service.js.map