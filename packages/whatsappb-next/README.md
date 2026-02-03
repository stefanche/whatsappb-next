# WhatsApp Business Next.js Library

A full-stack toolkit for integrating WhatsApp Business API into Next.js applications.

## Features

- **Multi-Phone Support**: Manage multiple numbers under one Meta account with phone selector UI
- **Database Agnostic**: Implement the `IWhatsAppStorage` interface with your own Prisma/Drizzle/MongoDB adapter
- **Ready UI Components**: Pre-built Chat Windows, Conversation Lists, Template Pickers, Message Composers, and Phone Selectors
- **Secure Webhooks**: HMAC-SHA256 signature verification for incoming Meta webhooks
- **Observer Pattern**: Subscribe to real-time events (`message:received`, `status:updated`, `error`)
- **Template Support**: Send and reconstruct template messages with variable substitution and clickable buttons

## Installation

```bash
npm install whatsapp-business-api-nextjs
```

## Quick Start

### 1. Implement Storage Interface

Create your own storage adapter implementing `IWhatsAppStorage`:

```typescript
import { IWhatsAppStorage, WhatsAppMessageRecord, WhatsAppConversation } from 'whatsapp-business-api-nextjs';

export class MyDatabaseStorage implements IWhatsAppStorage {
  async saveMessage(record: WhatsAppMessageRecord): Promise<void> {
    // Save to your database
  }

  async updateMessageStatus(waMessageId: string, status: string, timestamp: Date): Promise<void> {
    // Update message status in your database
  }

  async getHistory(customerNumber: string, phoneNumberId: string): Promise<WhatsAppMessageRecord[]> {
    // Retrieve messages for a customer + phone combination
  }

  async getConversations(phoneNumberId: string): Promise<WhatsAppConversation[]> {
    // Get all conversations for a phone number
  }
}
```

### 2. Initialize Client (Server-Side)

```typescript
import { WhatsAppClient } from 'whatsapp-business-api-nextjs';
import { myStorage } from './my-storage';

export const waClient = new WhatsAppClient({
  accessToken: process.env.WA_ACCESS_TOKEN!,
  accountId: process.env.WA_ACCOUNT_ID!,
  proxyUrl: '/api/whatsapp/proxy', // For frontend-to-backend communication
}, myStorage);
```

### 3. Create API Proxy Handler

In `pages/api/whatsapp/proxy.ts` (Pages Router) or `app/api/whatsapp/proxy/route.ts` (App Router):

```typescript
import { createWhatsAppHandler } from 'whatsapp-business-api-nextjs';
import { waClient, myStorage } from '@/lib/whatsapp';

// Pages Router
export default createWhatsAppHandler(waClient, myStorage);

// App Router
const handler = createWhatsAppHandler(waClient, myStorage);
export { handler as POST };
```

### 4. Set Up Provider (Client-Side)

```tsx
import { WhatsAppProvider } from 'whatsapp-business-api-nextjs';
import 'whatsapp-business-api-nextjs/styles';

// Create a client-side instance (no storage needed)
const clientSideWaClient = new WhatsAppClient({
  accessToken: '', // Not used on client
  accountId: process.env.NEXT_PUBLIC_WA_ACCOUNT_ID!,
  proxyUrl: '/api/whatsapp/proxy',
});

export default function App({ Component, pageProps }) {
  return (
    <WhatsAppProvider client={clientSideWaClient}>
      <Component {...pageProps} />
    </WhatsAppProvider>
  );
}
```

### 5. Use Components

```tsx
import { 
  PhoneSelector,
  ConversationList,
  MessageHistory,
  MessageComposer,
  TemplatePicker,
  TemplateForm,
  useWhatsApp 
} from 'whatsapp-business-api-nextjs';

export default function WhatsAppDashboard() {
  const { activePhone } = useWhatsApp();
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside>
        <PhoneSelector label="Send from:" />
        <ConversationList 
          phoneNumberId={activePhone?.phoneNumberId}
          onSelectConversation={(conv) => setSelectedCustomer(conv.customerNumber)}
        />
      </aside>

      {/* Chat Area */}
      <main>
        {selectedCustomer && activePhone && (
          <>
            <MessageHistory 
              customerNumber={selectedCustomer}
              phoneNumberId={activePhone.phoneNumberId}
            />
            <MessageComposer
              customerNumber={selectedCustomer}
              phoneNumberId={activePhone.phoneNumberId}
              onMessageSent={() => console.log('Sent!')}
            />
          </>
        )}
      </main>
    </div>
  );
}
```

## Webhook Setup

### Secure Webhook Handler

```typescript
import { WhatsAppWebhookHandler } from 'whatsapp-business-api-nextjs';
import { myStorage } from './my-storage';

const webhookHandler = new WhatsAppWebhookHandler({
  verifyToken: process.env.WA_VERIFY_TOKEN!,
  appSecret: process.env.WA_APP_SECRET!, // Required for signature verification
}, myStorage);

// Subscribe to events (Observer Pattern)
webhookHandler.on('message:received', (event) => {
  console.log('New message from:', event.message.customerNumber);
  console.log('Content:', event.message.content);
  // Trigger notifications, update UI, etc.
});

webhookHandler.on('status:updated', (event) => {
  console.log('Message status:', event.status.status); // sent, delivered, read, failed
});

webhookHandler.on('error', (event) => {
  console.error('Webhook error:', event.error);
});
```

### Pages Router (`pages/api/whatsapp/webhook.ts`)

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { webhookHandler } from '@/lib/whatsapp';

export const config = {
  api: { bodyParser: false }, // Required for signature verification
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Webhook verification
    const result = webhookHandler.verify({
      'hub.mode': req.query['hub.mode'] as string,
      'hub.verify_token': req.query['hub.verify_token'] as string,
      'hub.challenge': req.query['hub.challenge'] as string,
    });
    
    if (result.startsWith('Error')) {
      return res.status(403).send(result);
    }
    return res.status(200).send(result);
  }

  if (req.method === 'POST') {
    // Get raw body for signature verification
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const signature = req.headers['x-hub-signature-256'] as string;

    // Verify signature
    if (!webhookHandler.verifySignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook
    const payload = JSON.parse(rawBody);
    const result = await webhookHandler.handle(payload);
    return res.status(200).json({ result });
  }

  res.status(405).end();
}
```

### App Router (`app/api/whatsapp/webhook/route.ts`)

```typescript
import { webhookHandler } from '@/lib/whatsapp';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = webhookHandler.verify({
    'hub.mode': params.get('hub.mode') || '',
    'hub.verify_token': params.get('hub.verify_token') || '',
    'hub.challenge': params.get('hub.challenge') || '',
  });
  
  if (result.startsWith('Error')) {
    return new Response(result, { status: 403 });
  }
  return new Response(result, { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256') || '';

  if (!webhookHandler.verifySignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const result = await webhookHandler.handle(payload);
  return Response.json({ result });
}
```

## Sending Templates

```typescript
import { useWhatsApp } from 'whatsapp-business-api-nextjs';

function SendTemplateButton({ template, customerNumber }) {
  const { client, activePhone } = useWhatsApp();

  const handleSend = async () => {
    await client.sendTemplate({
      fromPhoneNumberId: activePhone.phoneNumberId,
      to: customerNumber,
      templateName: template.name,
      languageCode: template.language,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'John Doe' },
            { type: 'text', text: 'ORDER-12345' },
          ],
        },
      ],
      // Include template for message reconstruction in storage
      templateSnapshot: template,
    });
  };

  return <button onClick={handleSend}>Send Template</button>;
}
```

## Components Reference

| Component | Description |
|-----------|-------------|
| `WhatsAppProvider` | Context provider, wraps your app |
| `PhoneSelector` | Dropdown to select active WhatsApp Business phone |
| `ConversationList` | List of conversations for a phone number |
| `MessageHistory` | Displays message history with a customer |
| `MessageComposer` | Input for sending text/image/document messages |
| `TemplatePicker` | Grid of available message templates |
| `TemplateForm` | Form to fill template variables before sending |
| `MessageBubble` | Individual message display with buttons support |

## Hooks

| Hook | Returns |
|------|---------|
| `useWhatsApp()` | `{ client, templates, phones, activePhone, setActivePhone, isLoading, refreshData }` |

## Types

```typescript
import type {
  // Config
  WhatsAppConfig,
  WhatsAppPhoneConfig,
  
  // Messages
  WhatsAppMessageRecord,
  WhatsAppConversation,
  
  // Templates
  WhatsAppTemplate,
  SendTemplateOptions,
  
  // Webhooks
  WebhookHandlerConfig,
  WebhookEvent,
  MessageReceivedEvent,
  StatusUpdatedEvent,
  WebhookErrorEvent,
  
  // Storage
  IWhatsAppStorage,
} from 'whatsapp-business-api-nextjs';
```

## Environment Variables

```bash
# Required
WA_ACCESS_TOKEN=your_meta_access_token
WA_ACCOUNT_ID=your_whatsapp_business_account_id
WA_VERIFY_TOKEN=your_webhook_verify_token
WA_APP_SECRET=your_meta_app_secret

# Optional (for client-side)
NEXT_PUBLIC_WA_ACCOUNT_ID=your_whatsapp_business_account_id
```

## License

GPL-3.0 - See [LICENSE](./LICENSE) for details.