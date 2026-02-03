import { Router, Request, Response } from 'express';
import { webhookHandler } from '../lib/whatsapp';

const router = Router();

// GET /webhook - Verification endpoint for Meta
router.get('/', (req: Request, res: Response) => {
  console.log('🔐 [Webhook] Verification request received');

  try {
    const challenge = webhookHandler.verify(req.query as Record<string, string>);
    console.log('✅ [Webhook] Verification successful');
    res.status(200).send(challenge);
  } catch (error) {
    console.error('❌ [Webhook] Verification failed:', error);
    res.status(403).json({ error: 'Verification failed' });
  }
});

// POST /webhook - Receive webhook events from Meta
router.post('/', async (req: Request, res: Response) => {
  console.log('📨 [Webhook] Event received');

  // Immediately acknowledge receipt
  res.status(200).json({ status: 'received' });

  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature && (req as any).rawBody) {
      const isValid = webhookHandler.verifySignature((req as any).rawBody, signature);
      if (!isValid) {
        console.warn('⚠️ [Webhook] Invalid signature');
      }
    }

    const result = await webhookHandler.handle(req.body);
    console.log('✅ [Webhook] Processed:', result);
  } catch (error) {
    console.error('❌ [Webhook] Processing error:', error);
  }
});

export default router;
