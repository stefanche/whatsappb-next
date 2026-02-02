import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { WhatsAppWebhookHandler } from './webhook';
import { WhatsAppWebhookPayload } from './types/webhooks';
import { IWhatsAppStorage, MessageStatus } from '../db/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockStorage = (): IWhatsAppStorage => ({
  saveMessage: vi.fn().mockResolvedValue(undefined),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  getConversations: vi.fn().mockResolvedValue([]),
  getHistory: vi.fn().mockResolvedValue([]),
});

const createMessagePayload = (overrides?: Partial<{
  from: string;
  id: string;
  text: string;
  phoneNumberId: string;
}>): WhatsAppWebhookPayload => ({
  object: 'whatsapp_business_account',
  entry: [{
    id: 'WABA_ID_123',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '+1234567890',
          phone_number_id: overrides?.phoneNumberId ?? 'PHONE_ID_123',
        },
        messages: [{
          from: overrides?.from ?? '+0987654321',
          id: overrides?.id ?? 'wamid.TEST123',
          timestamp: '1700000000',
          type: 'text',
          text: { body: overrides?.text ?? 'Hello, World!' },
        }],
      },
      field: 'messages',
    }],
  }],
});

const createStatusPayload = (overrides?: Partial<{
  id: string;
  status: MessageStatus;
  recipientId: string;
}>): WhatsAppWebhookPayload => ({
  object: 'whatsapp_business_account',
  entry: [{
    id: 'WABA_ID_123',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '+1234567890',
          phone_number_id: 'PHONE_ID_123',
        },
        statuses: [{
          id: overrides?.id ?? 'wamid.TEST123',
          status: overrides?.status ?? 'delivered',
          timestamp: '1700000000',
          recipient_id: overrides?.recipientId ?? '+0987654321',
        }],
      },
      field: 'messages',
    }],
  }],
});

const computeSignature = (body: string, secret: string): string => {
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${signature}`;
};

// ============================================================================
// TESTS: verify() - Webhook Subscription Handshake
// ============================================================================

describe('WhatsAppWebhookHandler.verify()', () => {
  const handler = new WhatsAppWebhookHandler({ verifyToken: 'my-secret-token' });

  it('should return challenge when token matches', () => {
    const query = {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'my-secret-token',
      'hub.challenge': 'CHALLENGE_123',
    };

    const result = handler.verify(query);
    expect(result).toBe('CHALLENGE_123');
  });

  it('should throw error when token does not match', () => {
    const query = {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong-token',
      'hub.challenge': 'CHALLENGE_123',
    };

    expect(() => handler.verify(query)).toThrow('Webhook verification failed: Token mismatch');
  });

  it('should throw error when mode is not subscribe', () => {
    const query = {
      'hub.mode': 'unsubscribe',
      'hub.verify_token': 'my-secret-token',
      'hub.challenge': 'CHALLENGE_123',
    };

    expect(() => handler.verify(query)).toThrow('Webhook verification failed: Token mismatch');
  });

  it('should throw error when parameters are missing', () => {
    expect(() => handler.verify({})).toThrow('Webhook verification failed: Token mismatch');
  });
});

// ============================================================================
// TESTS: verifySignature() - HMAC-SHA256 Signature Validation
// ============================================================================

describe('WhatsAppWebhookHandler.verifySignature()', () => {
  const appSecret = 'my-app-secret';
  const handler = new WhatsAppWebhookHandler({ verifyToken: 'token', appSecret });

  it('should return true for valid signature', () => {
    const body = JSON.stringify({ test: 'data' });
    const signature = computeSignature(body, appSecret);

    expect(handler.verifySignature(body, signature)).toBe(true);
  });

  it('should return false for invalid signature', () => {
    const body = JSON.stringify({ test: 'data' });
    const wrongSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    expect(handler.verifySignature(body, wrongSignature)).toBe(false);
  });

  it('should return false for tampered body', () => {
    const originalBody = JSON.stringify({ test: 'data' });
    const tamperedBody = JSON.stringify({ test: 'tampered' });
    const signature = computeSignature(originalBody, appSecret);

    expect(handler.verifySignature(tamperedBody, signature)).toBe(false);
  });

  it('should return false for missing sha256 prefix', () => {
    const body = JSON.stringify({ test: 'data' });
    const signatureWithoutPrefix = createHmac('sha256', appSecret).update(body).digest('hex');

    expect(handler.verifySignature(body, signatureWithoutPrefix)).toBe(false);
  });

  it('should return false for empty signature', () => {
    const body = JSON.stringify({ test: 'data' });
    expect(handler.verifySignature(body, '')).toBe(false);
  });

  it('should throw error when appSecret is not configured', () => {
    const handlerWithoutSecret = new WhatsAppWebhookHandler({ verifyToken: 'token' });
    const body = JSON.stringify({ test: 'data' });
    const signature = computeSignature(body, appSecret);

    expect(() => handlerWithoutSecret.verifySignature(body, signature))
      .toThrow('App secret not configured');
  });
});

// ============================================================================
// TESTS: handle() - Message Processing
// ============================================================================

describe('WhatsAppWebhookHandler.handle() - Messages', () => {
  let storage: IWhatsAppStorage;
  let handler: WhatsAppWebhookHandler;

  beforeEach(() => {
    storage = createMockStorage();
    handler = new WhatsAppWebhookHandler({ verifyToken: 'token' }, storage);
  });

  it('should save incoming text message to storage', async () => {
    const payload = createMessagePayload({
      from: '+15551234567',
      id: 'wamid.ABC123',
      text: 'Test message',
    });

    const result = await handler.handle(payload);

    expect(result).toEqual({ status: 'message_received', id: 'wamid.ABC123' });
    expect(storage.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        wamid: 'wamid.ABC123',
        customerNumber: '+15551234567',
        content: 'Test message',
        direction: 'inbound',
        status: 'delivered',
      })
    );
  });

  it('should handle message without storage configured', async () => {
    const handlerWithoutStorage = new WhatsAppWebhookHandler({ verifyToken: 'token' });
    const payload = createMessagePayload();

    const result = await handlerWithoutStorage.handle(payload);

    expect(result.status).toBe('message_received');
  });

  it('should emit message:received event', async () => {
    const payload = createMessagePayload({ text: 'Hello observer!' });
    const mockHandler = vi.fn();

    handler.on('message:received', mockHandler);
    await handler.handle(payload);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'message:received',
        message: expect.objectContaining({
          text: { body: 'Hello observer!' },
        }),
        metadata: expect.objectContaining({
          phoneNumberId: 'PHONE_ID_123',
        }),
      })
    );
  });
});

// ============================================================================
// TESTS: handle() - Status Updates
// ============================================================================

describe('WhatsAppWebhookHandler.handle() - Status Updates', () => {
  let storage: IWhatsAppStorage;
  let handler: WhatsAppWebhookHandler;

  beforeEach(() => {
    storage = createMockStorage();
    handler = new WhatsAppWebhookHandler({ verifyToken: 'token' }, storage);
  });

  it('should update message status in storage', async () => {
    const payload = createStatusPayload({
      id: 'wamid.STATUS123',
      status: 'read',
    });

    const result = await handler.handle(payload);

    expect(result).toEqual({
      status: 'status_updated',
      id: 'wamid.STATUS123',
      value: 'read',
    });
    expect(storage.updateStatus).toHaveBeenCalledWith('wamid.STATUS123', 'read');
  });

  it('should emit status:updated event', async () => {
    const payload = createStatusPayload({ status: 'delivered' });
    const mockHandler = vi.fn();

    handler.on('status:updated', mockHandler);
    await handler.handle(payload);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'status:updated',
        status: expect.objectContaining({
          status: 'delivered',
        }),
      })
    );
  });
});

// ============================================================================
// TESTS: handle() - Edge Cases & Malformed Payloads
// ============================================================================

describe('WhatsAppWebhookHandler.handle() - Edge Cases', () => {
  const handler = new WhatsAppWebhookHandler({ verifyToken: 'token' });

  it('should return ignored for empty entry array', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [],
    } as WhatsAppWebhookPayload;

    const result = await handler.handle(payload);
    expect(result).toEqual({ status: 'ignored' });
  });

  it('should return ignored for missing changes', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{ id: 'WABA_ID', changes: [] }],
    } as unknown as WhatsAppWebhookPayload;

    const result = await handler.handle(payload);
    expect(result).toEqual({ status: 'ignored' });
  });

  it('should return no_actionable_data when no messages or statuses', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_ID',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+1234567890',
              phone_number_id: 'PHONE_ID',
            },
            // No messages or statuses
          },
          field: 'messages',
        }],
      }],
    } as WhatsAppWebhookPayload;

    const result = await handler.handle(payload);
    expect(result).toEqual({ status: 'no_actionable_data' });
  });
});

// ============================================================================
// TESTS: Observer Pattern - on/off/emit
// ============================================================================

describe('WhatsAppWebhookHandler - Observer Pattern', () => {
  let handler: WhatsAppWebhookHandler;

  beforeEach(() => {
    handler = new WhatsAppWebhookHandler({ verifyToken: 'token' });
  });

  it('should allow subscribing and unsubscribing', async () => {
    const mockHandler = vi.fn();
    const unsubscribe = handler.on('message:received', mockHandler);

    await handler.handle(createMessagePayload());
    expect(mockHandler).toHaveBeenCalledTimes(1);

    // Unsubscribe
    unsubscribe();
    await handler.handle(createMessagePayload());
    expect(mockHandler).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  it('should support multiple handlers for same event', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    handler.on('message:received', handler1);
    handler.on('message:received', handler2);

    await handler.handle(createMessagePayload());

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should emit error event when handler throws', async () => {
    const errorHandler = vi.fn();
    const throwingHandler = vi.fn().mockImplementation(() => {
      throw new Error('Handler error');
    });

    handler.on('message:received', throwingHandler);
    handler.on('error', errorHandler);

    await handler.handle(createMessagePayload());

    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        error: expect.objectContaining({ message: 'Handler error' }),
      })
    );
  });

  it('should support async handlers', async () => {
    const results: number[] = [];
    const asyncHandler = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      results.push(1);
    });

    handler.on('message:received', asyncHandler);
    await handler.handle(createMessagePayload());

    expect(results).toEqual([1]);
  });

  it('should manually unsubscribe with off()', async () => {
    const mockHandler = vi.fn();
    handler.on('message:received', mockHandler);

    await handler.handle(createMessagePayload());
    expect(mockHandler).toHaveBeenCalledTimes(1);

    handler.off('message:received', mockHandler);
    await handler.handle(createMessagePayload());
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
