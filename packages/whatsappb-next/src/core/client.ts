import { 
  WhatsappConfig, 
  WhatsAppApiResponse,
  SendTextOptions,
  SendImageOptions,
  SendVideoOptions,
  SendDocumentOptions,
  SendTemplateOptions,
  WhatsAppTemplate,
  WhatsAppPhoneConfig
} from './types';
import { IWhatsAppStorage, WhatsAppMessageRecord } from '../db/types';

export class WhatsAppClient {
  private config: WhatsappConfig;
  private baseUrl: string;
  private storage?: IWhatsAppStorage;

  constructor(config: WhatsappConfig, storage?: IWhatsAppStorage) {
    this.config = config;
    this.storage = storage;
    this.baseUrl = `https://graph.facebook.com/${config.apiVersion || 'v17.0'}`;
  }

  /**
   * Private helper to handle Fetch boilerplate and Error handling
   */
  private async request<T>(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API Error: ${data.error?.message || response.statusText}`);
    }

    return data as T;
  }

  /**
   * Internal helper to log outbound messages to the database
   */
  private async logMessage(options: any, apiResponse: WhatsAppApiResponse, type: string, content: string) {
    if (!this.storage) return;

    const record: WhatsAppMessageRecord = {
      wamid: apiResponse.messages[0].id,
      phoneNumberId: options.fromPhoneNumberId,
      customerNumber: options.to,
      type: type as any,
      content: content,
      direction: 'outbound',
      status: 'sent',
      timestamp: new Date(),
    };

    await this.storage.saveMessage(record);
  }

  // --- SERVICE WINDOW MESSAGES ---

  async sendText(options: SendTextOptions): Promise<WhatsAppApiResponse> {
    const res = await this.request<WhatsAppApiResponse>(`/${options.fromPhoneNumberId}/messages`, 'POST', {
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'text',
      text: { body: options.body, preview_url: options.preview_url }
    });
    
    await this.logMessage(options, res, 'text', options.body);
    return res;
  }

  async sendImage(options: SendImageOptions): Promise<WhatsAppApiResponse> {
    const res = await this.request<WhatsAppApiResponse>(`/${options.fromPhoneNumberId}/messages`, 'POST', {
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'image',
      image: options.image
    });

    await this.logMessage(options, res, 'image', options.image.caption || 'Image Message');
    return res;
  }

  async sendVideo(options: SendVideoOptions): Promise<WhatsAppApiResponse> {
    const res = await this.request<WhatsAppApiResponse>(`/${options.fromPhoneNumberId}/messages`, 'POST', {
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'video',
      video: options.video
    });

    await this.logMessage(options, res, 'video', options.video.caption || 'Video Message');
    return res;
  }

  async sendDocument(options: SendDocumentOptions): Promise<WhatsAppApiResponse> {
    const res = await this.request<WhatsAppApiResponse>(`/${options.fromPhoneNumberId}/messages`, 'POST', {
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'document',
      document: options.document
    });

    await this.logMessage(options, res, 'document', options.document.filename || 'Document Message');
    return res;
  }

  // --- TEMPLATE MESSAGES ---

  async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppApiResponse> {
    const res = await this.request<WhatsAppApiResponse>(`/${options.fromPhoneNumberId}/messages`, 'POST', {
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'template',
      template: {
        name: options.templateName,
        language: { code: options.languageCode },
        components: options.components
      }
    });

    await this.logMessage(options, res, 'template', `Template: ${options.templateName}`);
    return res;
  }

  // --- ACCOUNT MANAGEMENT ---

  async getTemplates(): Promise<{ data: WhatsAppTemplate[] }> {
    return this.request(`/${this.config.accountId}/message_templates`, 'GET');
  }

  async getPhoneNumbers(): Promise<{ data: WhatsAppPhoneConfig[] }> {
    return this.request(`/${this.config.accountId}/phone_numbers`, 'GET');
  }
}