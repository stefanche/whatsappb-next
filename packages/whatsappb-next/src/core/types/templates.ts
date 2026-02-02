export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

/** Structure for listing templates from Meta */
export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: TemplateStatus;
  category: TemplateCategory;
  language: string;
  components: any[]; 
}

/** Parameters for sending a template */
export interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video' | 'location' | 'payload';
  text?: string;
  image?: { link: string; id?: string };
  document?: { link: string; id?: string; filename?: string };
  video?: { link: string; id?: string };
}

export interface TemplateComponentValue {
  type: 'header' | 'body' | 'button';
  index?: number;
  parameters: TemplateParameter[];
}

/** Options passed to the client.sendTemplate method */
export interface SendTemplateOptions {
  fromPhoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponentValue[];
  /** Optional: Include the template structure to save a snapshot of what was sent */
  templateSnapshot?: WhatsAppTemplate;
}