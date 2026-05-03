import OpenAI from 'openai';
import { TranscriptionResult } from '@omnireport/shared';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export interface WhisperConfig {
  apiKey: string;
  model: 'whisper-1';
}

export interface TranscriptionRequest {
  audioUrl: string;
  language?: string;
  prompt?: string;
}

export class WhisperService {
  private client: OpenAI;
  private config: WhisperConfig;

  constructor(config: WhisperConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.config = config;
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    const audioBuffer = await this.downloadAudio(request.audioUrl);
    const tempPath = await this.createTempFile(audioBuffer, 'audio.mp3');

    try {
      const transcription = await this.client.audio.transcriptions.create({
        file: this.createFileObject(audioBuffer, 'audio.mp3'),
        model: this.config.model,
        language: request.language,
        prompt: request.prompt,
      });

      const t = transcription as any;
      return {
        text: this.cleanTranscript(transcription.text),
        language: t.language || 'en',
        duration: t.duration || 0,
      } as TranscriptionResult;
    } finally {
      await this.cleanupTempFile(tempPath);
    }
  }

  private async downloadAudio(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async createTempFile(buffer: Buffer, filename: string): Promise<string> {
    const tempPath = join(tmpdir(), `omnireport-${Date.now()}-${filename}`);
    await fs.writeFile(tempPath, buffer);
    return tempPath;
  }

  private createFileObject(buffer: Buffer, filename: string): File {
    return new File([buffer], filename, { type: 'audio/mpeg' });
  }

  private async cleanupTempFile(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (error) {
      console.warn(`Failed to cleanup temp file: ${path}`);
    }
  }

  private cleanTranscript(text: string): string {
    const fillerWords = ['um', 'uh', 'ah', 'like', 'you know', 'kind of', 'sort of'];
    let cleaned = text;

    fillerWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });

    return cleaned.replace(/\s+/g, ' ').trim();
  }
}
