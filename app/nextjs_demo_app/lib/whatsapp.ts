import { WhatsAppClient } from 'whatsappb-next';
import { memoryDb } from './whatsapp-storage';

export const waClient = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  accountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  phones: [
    { 
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '', 
      displayNumber: process.env.WHATSAPP_DISPLAY_NUMBER || '', 
      label: 'Main Office' 
    }
  ]
}, memoryDb);