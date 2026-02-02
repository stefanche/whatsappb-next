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

/** Represents a unique conversation (customer + business phone pair) */
export interface WhatsAppConversation {
  customerNumber: string;
  phoneNumberId: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export interface IWhatsAppStorage {
  saveMessage: (msg: WhatsAppMessageRecord) => Promise<void>;
  updateStatus: (wamid: string, status: MessageStatus) => Promise<void>;
  /** Get all unique conversations for a specific business phone number */
  getConversations: (phoneNumberId: string) => Promise<WhatsAppConversation[]>;
  /** Get message history for a specific customer and business phone */
  getHistory: (customerNumber: string, phoneNumberId: string) => Promise<WhatsAppMessageRecord[]>;
}