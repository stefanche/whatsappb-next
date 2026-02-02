import { WhatsAppWebhookPayload } from './types/webhooks';
import { IWhatsAppStorage, MessageStatus } from '../db/types';

export class WhatsAppWebhookHandler {
  constructor(
    private verifyToken: string,
    private storage?: IWhatsAppStorage
  ) {}

  /**
   * 1. The Handshake
   * Validates the GET request from Meta to enable the webhook.
   */
  verify(query: Record<string, string | string[] | undefined>) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge as string;
    }
    
    throw new Error('Webhook verification failed: Token mismatch');
  }

  /**
   * 2. The Processor
   * Parses the POST body and updates the DB automatically.
   */
  async handle(payload: WhatsAppWebhookPayload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (!changes) return { status: 'ignored' };

    // A. Handle Incoming Messages (Customer -> Business)
    if (changes.messages && changes.messages.length > 0) {
      const msg = changes.messages[0];
      
      if (this.storage) {
        await this.storage.saveMessage({
          wamid: msg.id,
          phoneNumberId: changes.metadata.phone_number_id,
          customerNumber: msg.from,
          type: msg.type as any,
          content: msg.text?.body || `Media: ${msg.type}`,
          direction: 'inbound',
          status: 'delivered', // Inbound messages are delivered by default
          timestamp: new Date(parseInt(msg.timestamp) * 1000),
          metadata: msg
        });
      }
      return { status: 'message_received', id: msg.id };
    }

    // B. Handle Status Updates (Sent -> Delivered -> Read)
    if (changes.statuses && changes.statuses.length > 0) {
      const statusUpdate = changes.statuses[0];
      
      if (this.storage) {
        await this.storage.updateStatus(statusUpdate.id, statusUpdate.status as MessageStatus);
      }
      return { status: 'status_updated', id: statusUpdate.id, value: statusUpdate.status };
    }

    return { status: 'no_actionable_data' };
  }
}