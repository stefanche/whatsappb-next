import { NextApiRequest, NextApiResponse } from 'next';
import { WhatsAppClient } from './client';
import { IWhatsAppStorage } from '../db/types';

/**
 * Creates a secure API route handler to proxy frontend requests to the Meta API.
 * This ensures tokens and database logic stay strictly on the server.
 * 
 * @param client - WhatsAppClient instance for Meta API communication
 * @param storage - Optional storage instance for message persistence/retrieval
 */
export function createWhatsAppHandler(client: WhatsAppClient, storage?: IWhatsAppStorage) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // 1. Security Check: Only allow POST requests for the proxy bridge
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
    console.log('Request body from the package handler class:', JSON.stringify(req.body, null, 2));
    const { action, payload } = req.body;
    // 2. Simple validation
    if (!action) {
      return res.status(400).json({ error: 'Missing action in request body' });
    }

    try {
      let result;

      // 3. Route the action to the corresponding WhatsAppClient method
      switch (action) {
        case 'sendMessage':
          // The client methods (sendText, sendImage, etc.) handle their own logic.
          // We can use a helper or check payload type, but for a proxy, 
          // we usually map based on what the FE called.
          if (payload.text) result = await client.sendText(payload);
          else if (payload.image) result = await client.sendImage(payload);
          else if (payload.video) result = await client.sendVideo(payload);
          else if (payload.document) result = await client.sendDocument(payload);
          else if (payload.template) result = await client.sendTemplate(payload);
          else throw new Error('Unrecognized message payload');
          break;

        case 'sendTemplate':
          result = await client.sendTemplate(payload);
          break;

        case 'getTemplates':
          result = await client.getTemplates();
          console.log('Templates from Meta:', JSON.stringify(result, null, 2));
          break;

        case 'getPhoneNumbers':
          result = await client.getPhoneNumbers();
          break;

        case 'getMessages':
          if (!storage) {
            return res.status(400).json({ error: 'Storage not configured for message retrieval' });
          }
          if (!payload?.customerNumber || !payload?.phoneNumberId) {
            return res.status(400).json({ error: 'Missing customerNumber or phoneNumberId in payload' });
          }
          result = await storage.getHistory(payload.customerNumber, payload.phoneNumberId);
          break;

        case 'getConversations':
          if (!storage) {
            return res.status(400).json({ error: 'Storage not configured for conversation retrieval' });
          }
          if (!payload?.phoneNumberId) {
            return res.status(400).json({ error: 'Missing phoneNumberId in payload' });
          }
          result = await storage.getConversations(payload.phoneNumberId);
          break;

        default:
          return res.status(400).json({ error: `Unsupported action: ${action}` });
      }

      // 4. Return the result from Meta (or the log result)
      return res.status(200).json(result);
    
    } catch (error: any) {
      console.error(`[WhatsAppB Proxy Error]:`, error.message);
      
      return res.status(error.status || 500).json({ 
        error: error.message || 'Internal Server Error',
        details: error.details || undefined 
      });
    }
  };
}