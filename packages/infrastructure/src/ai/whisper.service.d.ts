import { TranscriptionResult } from '@omnireport/shared';
export interface WhisperConfig {
    apiKey: string;
    model: 'whisper-1';
}
export interface TranscriptionRequest {
    audioUrl: string;
    language?: string;
    prompt?: string;
}
export declare class WhisperService {
    private client;
    private config;
    constructor(config: WhisperConfig);
    transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
    private downloadAudio;
    private createTempFile;
    private createFileObject;
    private cleanupTempFile;
    private cleanTranscript;
}
//# sourceMappingURL=whisper.service.d.ts.map