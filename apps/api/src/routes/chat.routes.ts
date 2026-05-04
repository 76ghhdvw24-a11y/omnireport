import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Service } from '@omnireport/infrastructure';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

async function transcribeAudio(audioBuffer: Buffer, filename: string, apiKey: string, language: string = 'es'): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), filename);
  formData.append('model', 'whisper-1');
  formData.append('language', language === 'en' ? 'en' : language === 'pt' ? 'pt' : 'es');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Whisper transcription error:', err);
    throw new Error('Failed to transcribe audio');
  }

  const data = await response.json() as { text?: string };
  return data.text || '';
}

async function callAI(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it',
      messages,
      max_tokens: 4096,
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('NVIDIA API error:', err);
    throw new Error('AI API error');
  }

  const data = await response.json() as Record<string, any>;
  return data.choices?.[0]?.message?.content || '';
}

export function createChatRoutes(prisma: PrismaClient, s3Service?: S3Service): Router {
  const router = Router();

  router.get('/:reportId/chat', async (req, res) => {
    try {
      if (!req.orgId) return res.status(401).json({ error: 'Unauthorized' });

      const report = await prisma.report.findUnique({ where: { id: req.params.reportId as string } });
      if (!report || report.organizationId !== req.orgId) return res.status(404).json({ error: 'Report not found' });

      const messages = await prisma.chatMessage.findMany({
        where: { reportId: req.params.reportId as string },
        orderBy: { createdAt: 'asc' },
      });

      res.json({
        items: messages.map((m: any) => ({ id: m.id, reportId: m.reportId, role: m.role, content: m.content, createdAt: m.createdAt })),
      });
    } catch (error) {
      console.error('Error getting chat messages:', error);
      res.status(500).json({ error: 'Failed to get chat messages' });
    }
  });

  router.post('/:reportId/chat/audio', upload.single('audio'), async (req, res) => {
    try {
      if (!req.orgId || !req.userId) return res.status(401).json({ error: 'Unauthorized' });

      const file = req.file;
      if (!file) return res.status(400).json({ error: 'Audio file is required' });

      const reportId = req.params.reportId as string as string;
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report || report.organizationId !== req.orgId) return res.status(404).json({ error: 'Report not found' });
      if (!['COMPLETED', 'DRAFT', 'PENDING', 'PROCESSING', 'TRANSCRIBING', 'ANALYZING'].includes(report.status)) return res.status(400).json({ error: 'Chat is available once a report is created' });

      const whisperApiKey = process.env.OPENAI_API_KEY || '';
      if (!whisperApiKey) return res.status(500).json({ error: 'Audio transcription not configured' });

      const language = (report as any).language || 'es';
      const whisperLang = language === 'en' ? 'en' : language === 'pt' ? 'pt' : 'es';

      let transcription: string;
      try {
        transcription = await transcribeAudio(file.buffer, file.originalname || 'audio.webm', whisperApiKey, whisperLang);
      } catch (err) {
        console.error('Transcription error:', err);
        return res.status(500).json({ error: 'Failed to transcribe audio' });
      }

      if (!transcription.trim()) {
        return res.status(400).json({ error: 'No speech detected in audio' });
      }

      const userMessage = await prisma.chatMessage.create({
        data: { reportId: req.params.reportId as string, role: 'user', content: `🎤 ${transcription}` },
      });

      const nvidiaApiKey = process.env.NVIDIA_API_KEY || '';
      const reportSnapshot = JSON.stringify({
        title: report.title,
        description: report.description,
        findings: report.findings,
        executiveSummary: report.executiveSummary,
        recommendedAction: report.recommendedAction,
        subtotal: report.subtotal,
        taxRate: (report as any).taxRate,
        tax: report.tax,
        total: report.total,
        currency: report.currency,
      }, null, 2);

      const langInstructions: Record<string, string> = {
        es: 'Responde siempre en español.',
        en: 'Always respond in English.',
        pt: 'Responda sempre em português.',
      };

      const systemPrompt = buildSystemPrompt(langInstructions[language] || langInstructions['es'], reportSnapshot);

      const previousMessages = await prisma.chatMessage.findMany({
        where: { reportId: req.params.reportId as string },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      const chatHistory = previousMessages
        .filter((m: any) => m.id !== userMessage.id)
        .map((m: any) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

      const nvidiaMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: transcription },
      ];

      const assistantContent = await callAI(nvidiaMessages, nvidiaApiKey);
      const { text, modifications, suggestions } = parseAIResponse(assistantContent);

      const assistantMessage = await prisma.chatMessage.create({
        data: { reportId: req.params.reportId as string, role: 'assistant', content: text },
      });

      await applyModifications(prisma, req.params.reportId as string, modifications);

      res.json({
        message: { id: assistantMessage.id, reportId: assistantMessage.reportId, role: assistantMessage.role, content: assistantMessage.content, createdAt: assistantMessage.createdAt },
        transcription,
        modifications: modifications.length > 0 ? modifications : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      });
    } catch (error) {
      console.error('Error in audio chat:', error);
      res.status(500).json({ error: 'Failed to process audio chat' });
    }
  });

  router.post('/:reportId/chat', async (req, res) => {
    try {
      if (!req.orgId || !req.userId) return res.status(401).json({ error: 'Unauthorized' });

      const { message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) return res.status(400).json({ error: 'Message is required' });

      const report = await prisma.report.findUnique({ where: { id: req.params.reportId as string } });
      if (!report || report.organizationId !== req.orgId) return res.status(404).json({ error: 'Report not found' });
      if (!['COMPLETED', 'DRAFT', 'PENDING', 'PROCESSING', 'TRANSCRIBING', 'ANALYZING'].includes(report.status)) return res.status(400).json({ error: 'Chat is available once a report is created' });

      const userMessage = await prisma.chatMessage.create({
        data: { reportId: req.params.reportId as string, role: 'user', content: message.trim() },
      });

      const apiKey = process.env.NVIDIA_API_KEY || '';
      const language = (report as any).language || 'es';

      const langInstructions: Record<string, string> = {
        es: 'Responde siempre en español.',
        en: 'Always respond in English.',
        pt: 'Responda sempre em português.',
      };

      const reportSnapshot = JSON.stringify({
        title: report.title,
        description: report.description,
        findings: report.findings,
        executiveSummary: report.executiveSummary,
        recommendedAction: report.recommendedAction,
        severity: report.severity,
        subtotal: report.subtotal,
        taxRate: (report as any).taxRate,
        tax: report.tax,
        total: report.total,
        currency: report.currency,
        paymentTerms: (report as any).paymentTerms,
      }, null, 2);

      const systemPrompt = buildSystemPrompt(langInstructions[language] || langInstructions['es'], reportSnapshot);

      const previousMessages = await prisma.chatMessage.findMany({
        where: { reportId: req.params.reportId as string },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      const chatHistory = previousMessages
        .filter((m: any) => m.id !== userMessage.id)
        .map((m: any) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

      const nvidiaMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: message.trim() },
      ];

      const assistantContent = await callAI(nvidiaMessages, apiKey);
      const { text, modifications, suggestions } = parseAIResponse(assistantContent);

      const assistantMessage = await prisma.chatMessage.create({
        data: { reportId: req.params.reportId as string, role: 'assistant', content: text },
      });

      await applyModifications(prisma, req.params.reportId as string, modifications);

      res.json({
        message: { id: assistantMessage.id, reportId: assistantMessage.reportId, role: assistantMessage.role, content: assistantMessage.content, createdAt: assistantMessage.createdAt },
        modifications: modifications.length > 0 ? modifications : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      });
    } catch (error) {
      console.error('Error in chat:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  return router;
}

function buildSystemPrompt(langInstruction: string, reportSnapshot: string): string {
  return `You are an AI assistant helping edit and improve a technical inspection quote/budget report (presupuesto). ${langInstruction}

Current report data:
${reportSnapshot}

You can help the user modify any part of the report. You have TWO types of actions:

1. IMMEDIATE CHANGES (<<<MODIFY>>>): Apply changes right away.
2. SUGGESTIONS (<<<SUGGEST>>>): Propose changes for the user to review and accept.

=== IMMEDIATE CHANGES ===
When you want to apply a change immediately, output:
<<<MODIFY>>>
{"field": "fieldName", "value": newValue}
<<<MODIFY>>>

=== SUGGESTIONS ===
When you want to propose a change for the user to review, output:
<<<SUGGEST>>>
{"field": "fieldName", "value": newValue, "reason": "explanation of why this is suggested"}
<<<SUGGEST>>>

Use <<<SUGGEST>>> when:
- Adding new items/findings that weren't explicitly requested
- Changing prices or quantities the user didn't ask to change
- Proposing improvements to the budget structure
- Suggesting additional work or considerations

Use <<<MODIFY>>> when:
- The user explicitly asks for a specific change
- Correcting errors or typos
- Updating exact values the user specified

Available fields to modify:
- "title" (string)
- "description" (string or null)
- "executiveSummary" (string)
- "recommendedAction" (string)
- "severity" (one of: CRITICAL, HIGH, MEDIUM, LOW, INFO)
- "subtotal" (number)
- "taxRate" (number, e.g. 19 for 19%)
- "tax" (number)
- "total" (number)
- "paymentTerms" (string)
- "findings" (array of objects)
- "currency" (string: USD, EUR, MXN, COP, ARS, BRL, PEN, CLP, GBP)

Each finding has: description (string), severity (CRITICAL|HIGH|MEDIUM|LOW|INFO), confidence (0-1), component (string, optional), estimatedCost (number), quantity (number, default 1).

IMPORTANT RULES:
- You can include multiple <<<MODIFY>>> and <<<SUGGEST>>> blocks in a single response.
- Always explain what you changed or suggested in plain text.
- When modifying findings, ALWAYS output the full array (it replaces the existing one).
- For monetary values, use plain numbers (no currency symbols).
- Be proactive: if you notice issues, missing items, or opportunities for improvement, suggest them using <<<SUGGEST>>>.
- When the user sends audio (transcribed), interpret their words naturally and make appropriate changes.
- If the budget seems incomplete or prices seem unrealistic, suggest corrections.
- Currency format note: for CLP/COP/ARS/BRL/PEN, amounts use dots as thousands separator and no decimals (e.g. 150000 = one hundred fifty thousand). For USD/EUR/GBP, use standard decimal format.`;
}

function parseAIResponse(content: string): { text: string; modifications: Array<{ field: string; value: unknown }>; suggestions: Array<{ field: string; value: unknown; reason: string }> } {
  const modifications: Array<{ field: string; value: unknown }> = [];
  const suggestions: Array<{ field: string; value: unknown; reason: string }> = [];

  const modRegex = /<<<MODIFY>>>\s*([\s\S]*?)\s*<<<MODIFY>>>/g;
  let match;
  while ((match = modRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.field && parsed.value !== undefined) {
        modifications.push({ field: parsed.field, value: parsed.value });
      }
    } catch {}
  }

  const sugRegex = /<<<SUGGEST>>>\s*([\s\S]*?)\s*<<<SUGGEST>>>/g;
  while ((match = sugRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.field && parsed.value !== undefined) {
        suggestions.push({ field: parsed.field, value: parsed.value, reason: parsed.reason || '' });
      }
    } catch {}
  }

  let text = content;
  text = text.replace(/<<<MODIFY>>>[\s\S]*?<<<MODIFY>>>/g, '').trim();
  text = text.replace(/<<<SUGGEST>>>[\s\S]*?<<<SUGGEST>>>/g, '').trim();

  return { text, modifications, suggestions };
}

async function applyModifications(prisma: PrismaClient, reportId: string, modifications: Array<{ field: string; value: unknown }>): Promise<void> {
  const allowedFields = ['title', 'description', 'findings', 'executiveSummary', 'recommendedAction', 'severity', 'subtotal', 'taxRate', 'tax', 'total', 'paymentTerms', 'currency'];

  for (const mod of modifications) {
    if (allowedFields.includes(mod.field)) {
      await prisma.report.update({
        where: { id: reportId },
        data: { [mod.field]: mod.value },
      });
    }
  }
}