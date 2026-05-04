import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';

// Magic bytes signatures for allowed file types
const FILE_SIGNATURES: Record<string, { mime: string; ext: string; bytes: number[] }[]> = {
  image: [
    { mime: 'image/jpeg', ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
    { mime: 'image/jpeg', ext: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
    { mime: 'image/png', ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
    { mime: 'image/webp', ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
  ],
  audio: [
    { mime: 'audio/mpeg', ext: 'mp3', bytes: [0xff, 0xfb] }, // MP3 with ID3
    { mime: 'audio/mpeg', ext: 'mp3', bytes: [0xff, 0xf3] },
    { mime: 'audio/mpeg', ext: 'mp3', bytes: [0xff, 0xf2] },
    { mime: 'audio/mp4', ext: 'm4a', bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70] }, // ftyp
    { mime: 'audio/wav', ext: 'wav', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    { mime: 'audio/aac', ext: 'aac', bytes: [0xff, 0xf1] }, // ADTS
    { mime: 'audio/aac', ext: 'aac', bytes: [0xff, 0xf9] }, // ADTS
  ],
};

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp',
  '.mp3', '.m4a', '.wav', '.aac',
]);

function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext)
    .replace(/[^a-z0-9\-_]/gi, '_')
    .substring(0, 100);
  return `${base}_${Date.now()}${ext}`;
}

function detectMimeBySignature(buffer: Buffer): { mime: string; ext: string } | null {
  for (const category of ['image', 'audio']) {
    for (const sig of FILE_SIGNATURES[category]) {
      if (buffer.length >= sig.bytes.length) {
        const matches = sig.bytes.every((byte, i) => buffer[i] === byte);
        if (matches) {
          return { mime: sig.mime, ext: sig.ext };
        }
      }
    }
  }
  return null;
}

export function createUploadMiddleware(options: { maxSize: number; maxFiles: number }) {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: { fileSize: options.maxSize, files: options.maxFiles },
    fileFilter: (_req, file, cb) => {
      // Check extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new Error(`Unsupported file extension: ${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`));
      }

      // Check mimetype prefix
      const isImage = file.mimetype.startsWith('image/');
      const isAudio = file.mimetype.startsWith('audio/');
      if (!isImage && !isAudio) {
        return cb(new Error(`Unsupported file type: ${file.mimetype}. Only images and audio are allowed.`));
      }

      cb(null, true);
    },
  }).array('files', options.maxFiles);
}

// Middleware to validate file content (magic bytes) after multer processing
export function validateFileContent(req: Request, _res: Response, next: NextFunction) {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return next();
  }

  for (const file of files) {
    const detected = detectMimeBySignature(file.buffer);
    if (!detected) {
      return next(new Error(`File content does not match allowed types: ${file.originalname}`));
    }

    // Update mimetype to the detected one (more reliable)
    file.mimetype = detected.mime;

    // Sanitize filename
    file.originalname = sanitizeFilename(file.originalname);
  }

  next();
}