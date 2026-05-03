import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createChatRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/:reportId/chat', async (req, res) => {
    try {
      if (!req.orgId) return res.status(401).json({ error: 'Unauthorized' });

      const report = await prisma.report.findUnique({ where: { id: req.params.reportId } });
      if (!report || report.organizationId !== req.orgId) return res.status(404).json({ error: 'Report not found' });

      const messages = await prisma.chatMessage.findMany({
        where: { reportId: req.params.reportId },
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

  router.post('/:reportId/chat', async (req, res) => {
    try {
      if (!req.orgId || !req.userId) return res.status(401).json({ error: 'Unauthorized' });

      const { message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) return res.status(400).json({ error: 'Message is required' });

      const report = await prisma.report.findUnique({ where: { id: req.params.reportId } });
      if (!report || report.organizationId !== req.orgId) return res.status(404).json({ error: 'Report not found' });
      if (!['COMPLETED', 'DRAFT'].includes(report.status)) return res.status(400).json({ error: 'Chat is only available for completed or draft reports' });

      const userMessage = await prisma.chatMessage.create({
        data: { reportId: req.params.reportId, role: 'user', content: message.trim() },
      });

      const apiKey = process.env.NVIDIA_API_KEY || '';
      const language = (report as any).language || 'es';

      const langInstructions: Record<string, string> = {
        es: 'Responde siempre en español. Los campos del presupuesto están en español.',
        en: 'Always respond in English. The report fields are in English.',
        pt: 'Responda sempre em português. Os campos do orçamento estão em português.',
      };

      const reportSnapshot = JSON.stringify({
        title: report.title,
        description: report.description,
        status: report.status,
        findings: report.findings,
        executiveSummary: report.executiveSummary,
        recommendedAction: report.recommendedAction,
        severity: report.severity,
        subtotal: report.subtotal,
        tax: report.tax,
        total: report.total,
        currency: report.currency,
      }, null, 2);

      const previousMessages = await prisma.chatMessage.findMany({
        where: { reportId: req.params.reportId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      const chatHistory = previousMessages
        .filter((m: any) => m.id !== userMessage.id)
        .map((m: any) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

      const systemPrompt = `You are an AI assistant helping edit a technical inspection quote/budget report. ${langInstructions[language] || langInstructions['es']}

Current report data:
${reportSnapshot}

You can help the user modify any part of the report. When you want to apply a change, output a JSON block wrapped in <<<MODIFY>>> tags like this:

<<<MODIFY>>>
{"field": "fieldName", "value": newValue}
<<<MODIFY>>>

Available fields to modify:
- "title" (string)
- "description" (string or null)
- "executiveSummary" (string)
- "recommendedAction" (string)
- "severity" (one of: CRITICAL, HIGH, MEDIUM, LOW, INFO)
- "subtotal" (number)
- "tax" (number)
- "total" (number)
- "findings" (array of objects with: description, severity, confidence, component, estimatedCost)

For "findings", you must provide THE COMPLETE updated array. Each finding has: description (string), severity (CRITICAL|HIGH|MEDIUM|LOW|INFO), confidence (0-1), component (string, optional), estimatedCost (number, optional).

Examples of user requests and how to respond:
- "Cambia el precio del hallazgo 1 a 50000" → <<<MODIFY>>>{"field": "findings", "value": [...updated findings array with finding 0.estimatedCost = 50000]}<<<MODIFY>>>
- "Agrega un hallazgo sobre corrosión" → <<<MODIFY>>>{"field": "findings", "value": [...existing findings, {description: "Corrosión detectada", severity: "MEDIUM", confidence: 0.7, estimatedCost: 25000}]}<<<MODIFY>>>
- "Cambia la severidad del hallazgo 2 a HIGH" → <<<MODIFY>>>{"field": "findings", "value": [...updated findings array with finding 1.severity = "HIGH"]}<<<MODIFY>>>
- "Reescribe el resumen" → <<<MODIFY>>>{"field": "executiveSummary", "value": "New summary text here"}<<<MODIFY>>>

IMPORTANT:
- You can include multiple <<<MODIFY>>> blocks in a single response.
- Always explain what you changed in plain text as well.
- When modifying findings, ALWAYS output the full array (not just changes), because it will replace the existing array.
- Be precise with numbers: use numeric values for costs (not strings).
- Currency amounts should be plain numbers without symbols.`;

      const nvidiaMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: message.trim() },
      ];

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemma-4-31b-it',
          messages: nvidiaMessages,
          max_tokens: 4096,
          temperature: 0.3,
          stream: false,
        }),
      });

      let assistantContent: string;
      const modifications: Array<{ field: string; value: unknown }> = [];

      if (response.ok) {
        const data = await response.json() as Record<string, any>;
        assistantContent = data.choices?.[0]?.message?.content || 'No pude generar una respuesta. Intentá de nuevo.';
      } else {
        assistantContent = 'No pude procesar tu solicitud en este momento. Intentá de nuevo más tarde.';
      }

      const modRegex = /<<<MODIFY>>>\s*([\s\S]*?)\s*<<<MODIFY>>>/g;
      let match;
      while ((match = modRegex.exec(assistantContent)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.field && parsed.value !== undefined) {
            modifications.push({ field: parsed.field, value: parsed.value });
          }
        } catch {}
      }
      assistantContent = assistantContent.replace(/<<<MODIFY>>>[\s\S]*?<<<MODIFY>>>/g, '').trim();

      const assistantMessage = await prisma.chatMessage.create({
        data: { reportId: req.params.reportId, role: 'assistant', content: assistantContent },
      });

      for (const mod of modifications) {
        const allowedFields = ['title', 'description', 'findings', 'executiveSummary', 'recommendedAction', 'severity', 'subtotal', 'tax', 'total'];
        if (allowedFields.includes(mod.field)) {
          await prisma.report.update({
            where: { id: req.params.reportId },
            data: { [mod.field]: mod.value },
          });
        }
      }

      res.json({
        message: { id: assistantMessage.id, reportId: assistantMessage.reportId, role: assistantMessage.role, content: assistantMessage.content, createdAt: assistantMessage.createdAt },
        modifications: modifications.length > 0 ? modifications : undefined,
      });
    } catch (error) {
      console.error('Error in chat:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  });

  return router;
}