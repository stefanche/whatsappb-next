import { createWhatsAppHandler } from 'whatsappb-next';
import { waClient } from '../../../lib/whatsapp';
import { memoryDb } from '../../../lib/whatsapp-storage';

// Pass both client and storage to the handler
const handler = createWhatsAppHandler(waClient, memoryDb);

export default async (req: any, res: any) => {
  // Debugging: Log the body to see if the ID is actually reaching the server
  console.log('Request body, from the proxy endpoint of the app', JSON.stringify(req.body, null, 2));
  if (req.method === 'POST' && req.body?.templateName) {
    console.log(`[Proxy] Sending template: ${req.body.templateName} from ID: ${req.body.fromPhoneNumberId}`);
  }

  return handler(req, res);
};