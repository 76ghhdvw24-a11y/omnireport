"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessMediaUseCase = void 0;
class ProcessMediaUseCase {
    s3Service;
    constructor(deps) {
        this.s3Service = deps.s3Service;
    }
    async generateUploadUrl(organizationId, reportId, type, index, contentType) {
        const extension = this.getExtensionFromContentType(contentType);
        const key = this.s3Service.generateFileKey(organizationId, reportId, type, index, extension);
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
    async deleteFile(key) {
        return this.s3Service.deleteFile(key);
    }
    getExtensionFromContentType(contentType) {
        const mapping = {
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
exports.ProcessMediaUseCase = ProcessMediaUseCase;
//# sourceMappingURL=process-media.use-case.js.map