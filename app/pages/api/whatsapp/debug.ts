import { NextApiRequest, NextApiResponse } from 'next';
import { memoryDb } from '../../../lib/whatsapp-storage';

/**
 * Debug endpoint to view all messages in the database.
 * Only for development/testing purposes.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const messages = memoryDb.getAllMessages();
    return res.status(200).json({ 
      messages,
      count: messages.length 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
