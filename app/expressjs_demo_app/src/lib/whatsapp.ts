import { WhatsAppClient, WhatsAppWebhookHandler } from 'whatsapp-business-api-nextjs';
import { postgresStorage } from '../db/storage';

export const waClient = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  accountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  phones: [
    {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      displayNumber: process.env.WHATSAPP_DISPLAY_NUMBER || '',
      label: 'Main Office',
    },
  ],
}, postgresStorage);

export const webhookHandler = new WhatsAppWebhookHandler(
  {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.WHATSAPP_APP_SECRET,
  },
  postgresStorage
);

// Register event listeners (Observer Pattern)
webhookHandler.on('message:received', async (event) => {
  console.log('📩 [Webhook] Message received from:', event.message.from);
  console.log('   Type:', event.message.type);
  console.log('   Content:', event.message.text?.body || `[${event.message.type}]`);
  
  await postgresStorage.logWebhookEvent('message:received', {
    messageId: event.message.id,
    from: event.message.from,
    type: event.message.type,
    metadata: event.metadata,
  });
});

webhookHandler.on('status:updated', async (event) => {
  console.log('📊 [Webhook] Status updated:', event.status.id);
  console.log('   New Status:', event.status.status);
  
  await postgresStorage.logWebhookEvent('status:updated', {
    messageId: event.status.id,
    status: event.status.status,
    recipientId: event.status.recipient_id,
    metadata: event.metadata,
  });
});

webhookHandler.on('error', async (event) => {
  console.error('❌ [Webhook] Error:', event.error.message);
  
  await postgresStorage.logWebhookEvent('error', {
    error: event.error.message,
    stack: event.error.stack,
    context: event.context,
  });
});
