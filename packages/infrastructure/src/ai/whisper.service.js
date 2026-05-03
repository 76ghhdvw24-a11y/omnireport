"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperService = void 0;
const openai_1 = __importDefault(require("openai"));
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
class WhisperService {
    client;
    config;
    constructor(config) {
        this.client = new openai_1.default({ apiKey: config.apiKey });
        this.config = config;
    }
    async transcribe(request) {
        const audioBuffer = await this.downloadAudio(request.audioUrl);
        const tempPath = await this.createTempFile(audioBuffer, 'audio.mp3');
        try {
            const transcription = await this.client.audio.transcriptions.create({
                file: this.createFileObject(audioBuffer, 'audio.mp3'),
                model: this.config.model,
                language: request.language,
                prompt: request.prompt,
            });
            const t = transcription;
            return {
                text: this.cleanTranscript(transcription.text),
                language: t.language || 'en',
                duration: t.duration || 0,
            };
        }
        finally {
            await this.cleanupTempFile(tempPath);
        }
    }
    async downloadAudio(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download audio: ${response.statusText}`);
        }
        return Buffer.from(await response.arrayBuffer());
    }
    async createTempFile(buffer, filename) {
        const tempPath = (0, path_1.join)((0, os_1.tmpdir)(), `omnireport-${Date.now()}-${filename}`);
        await fs_1.promises.writeFile(tempPath, buffer);
        return tempPath;
    }
    createFileObject(buffer, filename) {
        return new File([buffer], filename, { type: 'audio/mpeg' });
    }
    async cleanupTempFile(path) {
        try {
            await fs_1.promises.unlink(path);
        }
        catch (error) {
            console.warn(`Failed to cleanup temp file: ${path}`);
        }
    }
    cleanTranscript(text) {
        const fillerWords = ['um', 'uh', 'ah', 'like', 'you know', 'kind of', 'sort of'];
        let cleaned = text;
        fillerWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            cleaned = cleaned.replace(regex, '');
        });
        return cleaned.replace(/\s+/g, ' ').trim();
    }
}
exports.WhisperService = WhisperService;
//# sourceMappingURL=whisper.service.js.map