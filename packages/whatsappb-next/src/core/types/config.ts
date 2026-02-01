export interface WhatsAppPhoneConfig {
  phoneNumberId: string;
  displayNumber: string;
  label?: string;
}

export interface WhatsappConfig {
  accountId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion?: string;
  phones: WhatsAppPhoneConfig[];
}

export interface WhatsAppApiResponse {
  messaging_product: 'whatsapp';
  contacts: [{ input: string; wa_id: string }];
  messages: [{ id: string }];
}