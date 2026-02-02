import { MessageStatus } from '../../db/types';

/** The raw structure of an incoming Webhook from Meta */
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string; // WABA ID
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: Array<IncomingMessage>;
        statuses?: Array<IncomingStatusUpdate>;
      };
      field: 'messages';
    }>;
  }>;
}

export interface IncomingMessage {
  from: string;
  id: string; // wamid
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'document' | 'button' | 'unknown';
  text?: { body: string };
  image?: { caption?: string; sha256: string; id: string; mime_type: string };
  // ... other media types
}

export interface IncomingStatusUpdate {
  id: string; // wamid
  status: MessageStatus;
  timestamp: string;
  recipient_id: string;
}