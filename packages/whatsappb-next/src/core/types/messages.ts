export interface MediaSource {
  id?: string;   // Meta Media ID
  link?: string; // External URL
  caption?: string;
}

export interface DocumentSource extends MediaSource {
  filename?: string;
}

export interface SendTextOptions {
  fromPhoneNumberId: string;
  to: string;
  body: string;
  preview_url?: boolean;
}

export interface SendImageOptions {
  fromPhoneNumberId: string;
  to: string;
  image: MediaSource;
}

export interface SendVideoOptions {
  fromPhoneNumberId: string;
  to: string;
  video: MediaSource;
}

export interface SendDocumentOptions {
  fromPhoneNumberId: string;
  to: string;
  document: DocumentSource;
}