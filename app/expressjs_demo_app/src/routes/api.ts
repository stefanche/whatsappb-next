import { Router, Request, Response } from 'express';
import { waClient } from '../lib/whatsapp';
import { postgresStorage } from '../db/storage';

const router = Router();

router.post('/whatsapp', async (req: Request, res: Response) => {
  const { action, payload } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Missing action in request body' });
  }

  try {
    let result;

    switch (action) {
      case 'sendMessage':
        if (payload.text) result = await waClient.sendText(payload);
        else if (payload.image) result = await waClient.sendImage(payload);
        else if (payload.video) result = await waClient.sendVideo(payload);
        else if (payload.document) result = await waClient.sendDocument(payload);
        else if (payload.template) result = await waClient.sendTemplate(payload);
        else throw new Error('Unrecognized message payload');
        break;

      case 'sendTemplate':
        result = await waClient.sendTemplate(payload);
        break;

      case 'getTemplates':
        result = await waClient.getTemplates();
        break;

      case 'getPhoneNumbers':
        result = await waClient.getPhoneNumbers();
        break;

      case 'getMessages':
        if (!payload?.customerNumber || !payload?.phoneNumberId) {
          return res.status(400).json({ error: 'Missing customerNumber or phoneNumberId' });
        }
        result = await postgresStorage.getHistory(payload.customerNumber, payload.phoneNumberId);
        break;

      case 'getConversations':
        if (!payload?.phoneNumberId) {
          return res.status(400).json({ error: 'Missing phoneNumberId' });
        }
        result = await postgresStorage.getConversations(payload.phoneNumberId);
        break;

      default:
        return res.status(400).json({ error: `Unsupported action: ${action}` });
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('[API Error]:', error.message);
    res.status(error.status || 500).json({
      error: error.message || 'Internal Server Error',
      details: error.details,
    });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-express-demo',
  });
});

router.get('/debug/messages', async (_req: Request, res: Response) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const messages = await prisma.whatsAppMessage.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    await prisma.$disconnect();
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug/events', async (_req: Request, res: Response) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const events = await prisma.webhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    await prisma.$disconnect();
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
