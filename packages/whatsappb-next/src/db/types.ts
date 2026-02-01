export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';

export interface WhatsAppMessageRecord {
  wamid: string;
  phoneNumberId: string;
  customerNumber: string;
  type: 'text' | 'image' | 'video' | 'document' | 'template';
  content: string;          
  direction: MessageDirection;
  status: MessageStatus;
  timestamp: Date;
  metadata?: any;           // Good practice to store raw JSON here
}

export interface IWhatsAppStorage {
  saveMessage: (msg: WhatsAppMessageRecord) => Promise<void>;
  updateStatus: (wamid: string, status: MessageStatus) => Promise<void>;
}