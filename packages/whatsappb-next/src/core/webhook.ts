import { createHmac, timingSafeEqual } from 'crypto';
import {
  WhatsAppWebhookPayload,
  WebhookHandlerConfig,
  WebhookMetadata,
  WebhookEvent,
  WebhookEventType,
  WebhookEventHandler,
  MessageReceivedEvent,
  StatusUpdatedEvent,
  WebhookErrorEvent,
} from './types/webhooks';
import { IWhatsAppStorage, MessageStatus } from '../db/types';

// ============================================================================
// WEBHOOK HANDLER WITH OBSERVER PATTERN
// ============================================================================

export class WhatsAppWebhookHandler {
  private verifyToken: string;
  private appSecret?: string;
  private storage?: IWhatsAppStorage;

  /** Event listeners registry */
  private listeners = new Map<WebhookEventType, Set<WebhookEventHandler<any>>>();

  constructor(config: WebhookHandlerConfig, storage?: IWhatsAppStorage) {
    this.verifyToken = config.verifyToken;
    this.appSecret = config.appSecret;
    this.storage = storage;
  }

  // ==========================================================================
  // OBSERVER PATTERN - EVENT SUBSCRIPTION
  // ==========================================================================

  /**
   * Subscribe to a webhook event.
   * @param eventType - The event type to listen for
   * @param handler - Callback function invoked when event fires
   * @returns Unsubscribe function
   * 
   * @example
   * ```typescript
   * const unsubscribe = webhook.on('message:received', async (event) => {
   *   console.log('New message from:', event.message.from);
   * });
   * 
   * // Later, to unsubscribe:
   * unsubscribe();
   * ```
   */
  on<T extends WebhookEventType>(
    eventType: T,
    handler: WebhookEventHandler<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Unsubscribe from a webhook event.
   * @param eventType - The event type to stop listening for
   * @param handler - The handler function to remove
   */
  off<T extends WebhookEventType>(
    eventType: T,
    handler: WebhookEventHandler<T>
  ): void {
    this.listeners.get(eventType)?.delete(handler);
  }

  /**
   * Emit an event to all registered listeners.
   * Errors in handlers are caught and emitted as error events.
   */
  private async emit<T extends WebhookEventType>(
    eventType: T,
    event: Extract<WebhookEvent, { type: T }>
  ): Promise<void> {
    const handlers = this.listeners.get(eventType);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        // Emit error event (but prevent infinite recursion)
        if (eventType !== 'error') {
          await this.emit('error', {
            type: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
            context: { originalEvent: event },
          });
        }
      }
    }
  }

  // ==========================================================================
  // SIGNATURE VERIFICATION
  // ==========================================================================

  /**
   * Verifies the webhook payload signature using HMAC-SHA256.
   * Meta sends this as the X-Hub-Signature-256 header.
   * 
   * @param rawBody - The raw request body as a string
   * @param signatureHeader - The X-Hub-Signature-256 header value (e.g., "sha256=abc123...")
   * @returns true if signature is valid, false otherwise
   * 
   * @example
   * ```typescript
   * // In your API route:
   * const signature = req.headers['x-hub-signature-256'];
   * const rawBody = await getRawBody(req);
   * 
   * if (!webhook.verifySignature(rawBody.toString(), signature)) {
   *   return res.status(401).json({ error: 'Invalid signature' });
   * }
   * ```
   */
  verifySignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.appSecret) {
      throw new Error('App secret not configured. Cannot verify signature.');
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const expectedSignature = signatureHeader.slice(7); // Remove 'sha256=' prefix
    const computedSignature = createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );
    } catch {
      return false; // Different lengths or invalid hex
    }
  }

  // ==========================================================================
  // WEBHOOK VERIFICATION (GET request from Meta)
  // ==========================================================================

  /**
   * Validates the GET request from Meta to enable the webhook subscription.
   * 
   * @param query - Query parameters from the request
   * @returns The challenge string if valid
   * @throws Error if token doesn't match
   */
  verify(query: Record<string, string | string[] | undefined>): string {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge as string;
    }
    
    throw new Error('Webhook verification failed: Token mismatch');
  }

  // ==========================================================================
  // WEBHOOK PROCESSING (POST request from Meta)
  // ==========================================================================

  /**
   * Parses and processes the webhook POST payload.
   * Saves data to storage (if configured) and emits events to observers.
   * 
   * @param payload - The parsed webhook payload from Meta
   * @returns Processing result status
   */
  async handle(payload: WhatsAppWebhookPayload): Promise<{
    status: 'message_received' | 'status_updated' | 'ignored' | 'no_actionable_data';
    id?: string;
    value?: string;
  }> {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (!changes) return { status: 'ignored' };

    // Build metadata for events
    const metadata: WebhookMetadata = {
      phoneNumberId: changes.metadata.phone_number_id,
      displayPhoneNumber: changes.metadata.display_phone_number,
      wabaId: entry.id,
    };

    // A. Handle Incoming Messages (Customer -> Business)
    if (changes.messages && changes.messages.length > 0) {
      const msg = changes.messages[0];
      
      // Save to storage if configured
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
          metadata: msg,
        });
      }

      // Emit event to observers
      const event: MessageReceivedEvent = {
        type: 'message:received',
        message: msg,
        metadata,
      };
      await this.emit('message:received', event);

      return { status: 'message_received', id: msg.id };
    }

    // B. Handle Status Updates (Sent -> Delivered -> Read)
    if (changes.statuses && changes.statuses.length > 0) {
      const statusUpdate = changes.statuses[0];
      
      // Update storage if configured
      if (this.storage) {
        await this.storage.updateStatus(statusUpdate.id, statusUpdate.status as MessageStatus);
      }

      // Emit event to observers
      const event: StatusUpdatedEvent = {
        type: 'status:updated',
        status: statusUpdate,
        metadata,
      };
      await this.emit('status:updated', event);

      return { status: 'status_updated', id: statusUpdate.id, value: statusUpdate.status };
    }

    return { status: 'no_actionable_data' };
  }
}