import { MessageStatus } from '../../db/types';

// ============================================================================
// WEBHOOK PAYLOAD TYPES (from Meta)
// ============================================================================

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

// ============================================================================
// WEBHOOK HANDLER CONFIGURATION
// ============================================================================

/** Configuration for WhatsAppWebhookHandler */
export interface WebhookHandlerConfig {
  /** Token used to verify webhook subscription (must match Meta app config) */
  verifyToken: string;
  /** App Secret from Meta Developer Console (used for signature verification) */
  appSecret?: string;
}

// ============================================================================
// OBSERVER PATTERN - EVENT TYPES
// ============================================================================

/** Metadata included with every webhook event */
export interface WebhookMetadata {
  /** The phone number ID that received the webhook */
  phoneNumberId: string;
  /** The display phone number */
  displayPhoneNumber: string;
  /** WhatsApp Business Account ID */
  wabaId: string;
}

/** Event emitted when a message is received from a customer */
export interface MessageReceivedEvent {
  type: 'message:received';
  message: IncomingMessage;
  metadata: WebhookMetadata;
}

/** Event emitted when a message status is updated (sent → delivered → read) */
export interface StatusUpdatedEvent {
  type: 'status:updated';
  status: IncomingStatusUpdate;
  metadata: WebhookMetadata;
}

/** Event emitted when an error occurs during webhook processing */
export interface WebhookErrorEvent {
  type: 'error';
  error: Error;
  context?: unknown;
}

/** Union type of all webhook events */
export type WebhookEvent = MessageReceivedEvent | StatusUpdatedEvent | WebhookErrorEvent;

/** Extracts the event type string literals */
export type WebhookEventType = WebhookEvent['type'];

/** Generic event handler type - infers payload from event type */
export type WebhookEventHandler<T extends WebhookEventType> = (
  event: Extract<WebhookEvent, { type: T }>
) => void | Promise<void>;