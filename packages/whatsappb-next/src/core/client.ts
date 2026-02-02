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
import { IWhatsAppStorage, WhatsAppMessageRecord, WhatsAppConversation } from '../db/types';
import { json } from 'stream/consumers';

/** Button structure for template messages */
export interface TemplateButton {
  text: string;
  type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
  url?: string;
  phoneNumber?: string;
}

export class WhatsAppClient {
  private config: WhatsappConfig;
  private baseUrl: string;
  private storage?: IWhatsAppStorage;
  private proxyUrl?: string;

  constructor(config: WhatsappConfig, storage?: IWhatsAppStorage, proxyUrl?: string) {
    this.config = config;
    this.storage = storage;
    this.proxyUrl = proxyUrl;
    this.baseUrl = `https://graph.facebook.com/${config.apiVersion || 'v23.0'}`;
  }

  /**
   * Private helper to handle Fetch boilerplate and Error handling.
   * Automatically switches between direct Meta calls (Server) and Proxy calls (Frontend).
   */
  private async request<T>(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<T> {
    // 1. Check if we should use the Proxy (Frontend Mode)
    if (typeof window !== 'undefined' && this.proxyUrl) {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // We wrap the request in an action/payload pattern for the backend handler
        body: JSON.stringify({
          action: this.mapEndpointToAction(endpoint, method),
          payload: body,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Proxy Error: ${response.statusText}`);
      }
      return data as T;
    }

    // 2. Direct Meta Call (Server Mode)
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
      throw new Error(`WhatsApp API Error on request to ${endpoint}: ${data.error?.message || response.statusText}`);
    }

    return data as T;
  }

  /**
   * Maps Meta API endpoints to internal client actions for the proxy handler
   */
  private mapEndpointToAction(endpoint: string, method: string): string {
    if (endpoint.includes('/messages')) {
      // Basic heuristic to distinguish message types if needed
      return 'sendMessage'; 
    }
    if (endpoint.includes('/message_templates')) return 'getTemplates';
    if (endpoint.includes('/phone_numbers')) return 'getPhoneNumbers';
    return 'unknown';
  }

  /**
   * Internal helper to log outbound messages to the database
   */
  private async logMessage(options: any, apiResponse: WhatsAppApiResponse, type: string, content: string, metadata?: any) {
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
      metadata: metadata,
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

  /**
   * Reconstructs the template message content by replacing placeholders with actual values.
   * Returns both the content and button metadata.
   */
  private reconstructTemplateContent(options: SendTemplateOptions): { content: string; buttons: TemplateButton[] } {
    if (!options.templateSnapshot) {
      return { content: `Template: ${options.templateName}`, buttons: [] };
    }

    const template = options.templateSnapshot;
    const parts: string[] = [];
    const buttons: TemplateButton[] = [];

    // Find component values by type
    const getComponentParams = (type: string): string[] => {
      const comp = options.components?.find(c => c.type === type);
      if (!comp?.parameters) return [];
      return comp.parameters.map(p => p.text || '[media]').filter(Boolean) as string[];
    };

    // Get button URL suffixes
    const getButtonParams = (): Map<number, string> => {
      const params = new Map<number, string>();
      options.components?.forEach(c => {
        if (c.type === 'button' && c.index !== undefined && c.parameters?.[0]?.text) {
          params.set(parseInt(c.index.toString()), c.parameters[0].text);
        }
      });
      return params;
    };

    const headerParams = getComponentParams('header');
    const bodyParams = getComponentParams('body');
    const buttonParams = getButtonParams();

    // Process each template component
    for (const comp of template.components) {
      if (comp.type === 'HEADER') {
        if (comp.format === 'TEXT' && comp.text) {
          let text = comp.text;
          // Replace {{1}}, {{2}}, etc. with actual values
          headerParams.forEach((val, i) => {
            text = text.replace(`{{${i + 1}}}`, val);
          });
          parts.push(`*${text}*`); // Bold header
        } else if (comp.format === 'DOCUMENT') {
          parts.push('[📄 Document]');
        } else if (comp.format === 'IMAGE') {
          parts.push('[🖼️ Image]');
        }
      }

      if (comp.type === 'BODY' && comp.text) {
        let text = comp.text;
        // Replace {{1}}, {{2}}, etc. with actual values
        bodyParams.forEach((val, i) => {
          text = text.replace(`{{${i + 1}}}`, val);
        });
        parts.push(text);
      }

      if (comp.type === 'FOOTER' && comp.text) {
        parts.push(`_${comp.text}_`); // Italic footer
      }

      if (comp.type === 'BUTTONS' && comp.buttons) {
        comp.buttons.forEach((btn: any, idx: number) => {
          let url = btn.url;
          // Replace {{1}} in URL with the parameter value
          if (url && buttonParams.has(idx)) {
            url = url.replace('{{1}}', buttonParams.get(idx) || '');
          }
          
          buttons.push({
            text: btn.text,
            type: btn.type,
            url: url,
            phoneNumber: btn.phone_number
          });
        });
      }
    }

    return { 
      content: parts.join('\n\n') || `Template: ${options.templateName}`,
      buttons 
    };
  }

  async sendTemplate(options: SendTemplateOptions): Promise<WhatsAppApiResponse> {
    // When using proxy, send original options with a specific action
    if (typeof window !== 'undefined' && this.proxyUrl) {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendTemplate',
          payload: options,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Proxy Error: ${response.statusText}`);
      }
      return data as WhatsAppApiResponse;
    }

    // Direct Meta call - build the payload
    const path = `/${options.fromPhoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'template',
      template: {
        name: options.templateName,
        language: { code: options.languageCode },
        components: options.components
      },
    };

    const res = await this.request<WhatsAppApiResponse>(path, 'POST', payload);
    
    // Reconstruct and save the full template content with button metadata
    const { content, buttons } = this.reconstructTemplateContent(options);
    await this.logMessage(options, res, 'template', content, { buttons, templateName: options.templateName });
    
    return res;
  }

  // --- ACCOUNT MANAGEMENT ---

  async getTemplates(): Promise<{ data: WhatsAppTemplate[] }> {
    return this.request(`/${this.config.accountId}/message_templates`, 'GET');
  }

  async getPhoneNumbers(): Promise<{ data: WhatsAppPhoneConfig[] }> {
    // When using proxy, the handler already returns transformed data
    if (typeof window !== 'undefined' && this.proxyUrl) {
      return this.request(`/${this.config.accountId}/phone_numbers`, 'GET');
    }

    // Direct Meta call - need to transform the response
    const res = await this.request<any>(`/${this.config.accountId}/phone_numbers`, 'GET');
  
    // Map Meta's "id" to our "phoneNumberId"
    return {
      data: res.data.map((p: any) => ({
        phoneNumberId: p.id,
        displayNumber: p.display_phone_number,
        label: p.verified_name
      }))
    };
  }

  // --- MESSAGE HISTORY (via Storage) ---

  /**
   * Retrieves message history for a specific conversation.
   * This method only works via the proxy - it calls the storage layer on the server.
   * @param customerNumber - The customer's phone number
   * @param phoneNumberId - The WhatsApp Business phone number ID
   */
  async getMessages(customerNumber: string, phoneNumberId: string): Promise<WhatsAppMessageRecord[]> {
    if (typeof window !== 'undefined' && this.proxyUrl) {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getMessages',
          payload: { customerNumber, phoneNumberId },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Proxy Error: ${response.statusText}`);
      }
      return data as WhatsAppMessageRecord[];
    }

    // Server-side: This shouldn't be called directly - use storage.getHistory instead
    throw new Error('getMessages should be called via proxy on the frontend, or use storage.getHistory on the server');
  }

  /**
   * Retrieves all conversations for a specific WhatsApp Business phone.
   * This method only works via the proxy - it calls the storage layer on the server.
   * @param phoneNumberId - The WhatsApp Business phone number ID
   */
  async getConversations(phoneNumberId: string): Promise<WhatsAppConversation[]> {
    if (typeof window !== 'undefined' && this.proxyUrl) {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getConversations',
          payload: { phoneNumberId },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Proxy Error: ${response.statusText}`);
      }
      return data as WhatsAppConversation[];
    }

    // Server-side: This shouldn't be called directly - use storage.getConversations instead
    throw new Error('getConversations should be called via proxy on the frontend, or use storage.getConversations on the server');
  }
}