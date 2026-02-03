# WhatsApp Business Next.js

A full-stack toolkit for integrating WhatsApp Business API into Next.js applications. This monorepo contains the core library and a demo application.

## Features

### Core Library (`whatsapp-business-api-nextjs`)

- **WhatsApp Client** - Send messages, templates, images, documents via Meta API
- **Multi-Phone Support** - Manage multiple WhatsApp Business numbers under one account
- **Webhook Handler** - Process incoming messages with HMAC-SHA256 signature verification
- **Observer Pattern** - Subscribe to real-time events (`message:received`, `status:updated`, `error`)
- **Database Agnostic** - Implement `IWhatsAppStorage` interface with any database
- **Template Support** - Send templates with variable substitution and reconstruct for display

### React Components

| Component | Description |
|-----------|-------------|
| `WhatsAppProvider` | Context provider for client and state |
| `PhoneSelector` | Dropdown to select active WhatsApp Business phone |
| `ConversationList` | List of conversations for a phone number |
| `MessageHistory` | Displays message history with a customer |
| `MessageComposer` | Input for sending text/image/document messages |
| `TemplatePicker` | Grid of available message templates |
| `TemplateForm` | Form to fill template variables before sending |
| `MessageBubble` | Individual message display with clickable buttons |

## Quick Start

### Install the Library

```bash
npm install whatsapp-business-api-nextjs
```

### Basic Setup

```typescript
// lib/whatsapp.ts (server-side)
import { WhatsAppClient, WhatsAppWebhookHandler } from 'whatsapp-business-api-nextjs';
import { myStorage } from './my-storage';

export const waClient = new WhatsAppClient({
  accessToken: process.env.WA_ACCESS_TOKEN!,
  accountId: process.env.WA_ACCOUNT_ID!,
  proxyUrl: '/api/whatsapp/proxy',
}, myStorage);

export const webhookHandler = new WhatsAppWebhookHandler({
  verifyToken: process.env.WA_VERIFY_TOKEN!,
  appSecret: process.env.WA_APP_SECRET!,
}, myStorage);

// Subscribe to incoming messages
webhookHandler.on('message:received', (event) => {
  console.log('New message:', event.message.content);
});
```

```tsx
// pages/_app.tsx
import { WhatsAppProvider } from 'whatsapp-business-api-nextjs';
import 'whatsapp-business-api-nextjs/styles';

const clientSideWaClient = new WhatsAppClient({
  accessToken: '',
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

```tsx
// pages/index.tsx
import { 
  PhoneSelector, 
  ConversationList, 
  MessageHistory, 
  MessageComposer,
  useWhatsApp 
} from 'whatsapp-business-api-nextjs';

export default function Dashboard() {
  const { activePhone } = useWhatsApp();
  const [customer, setCustomer] = useState(null);

  return (
    <div style={{ display: 'flex' }}>
      <aside>
        <PhoneSelector />
        <ConversationList 
          phoneNumberId={activePhone?.phoneNumberId}
          onSelectConversation={(c) => setCustomer(c.customerNumber)}
        />
      </aside>
      <main>
        {customer && activePhone && (
          <>
            <MessageHistory 
              customerNumber={customer}
              phoneNumberId={activePhone.phoneNumberId}
            />
            <MessageComposer
              customerNumber={customer}
              phoneNumberId={activePhone.phoneNumberId}
            />
          </>
        )}
      </main>
    </div>
  );
}
```

See the [library README](./packages/whatsappb-next/README.md) for complete documentation.

## Running the Demo App

### Prerequisites

- Node.js 18+
- Meta Developer Account with WhatsApp Business API access
- WhatsApp Business Account ID and Access Token

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/stefanche/whatsappb-next.git
cd whatsappb-next
```

2. **Install dependencies**

```bash
# Install root dependencies
npm install

# Install library dependencies
cd packages/whatsappb-next
npm install
npm run build
cd ../..

# Install demo app dependencies
cd app
npm install
```

3. **Configure environment variables**

Create `app/.env.local`:

```bash
# Meta API Credentials
WA_ACCESS_TOKEN=your_meta_access_token
WA_ACCOUNT_ID=your_whatsapp_business_account_id
WA_VERIFY_TOKEN=your_webhook_verify_token
WA_APP_SECRET=your_meta_app_secret

# Public (accessible in browser)
NEXT_PUBLIC_WA_ACCOUNT_ID=your_whatsapp_business_account_id
```

4. **Run the demo**

```bash
cd app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Features

- **Phone Selector** - Switch between WhatsApp Business numbers
- **Conversation List** - View all conversations for selected phone
- **Message History** - See full chat history with customers
- **Send Messages** - Text, images, documents
- **Send Templates** - Pick template, fill variables, send
- **Debug View** - Inspect all stored messages

## Development

### Library Development

```bash
cd packages/whatsappb-next

# Watch mode (recompile on changes)
npm run dev

# Run tests
npm run test

# Run tests once
npm run test:run

# Build for production
npm run build
```

### Running Tests

The library includes comprehensive unit tests for the webhook handler:

```bash
cd packages/whatsappb-next
npm run test:run
```

Tests cover:
- Webhook verification (token validation)
- Signature verification (HMAC-SHA256)
- Message parsing and storage
- Status update handling
- Observer pattern (event subscriptions)
- Edge cases and malformed payloads

## Implementing Storage

The library requires you to implement the `IWhatsAppStorage` interface:

```typescript
import { 
  IWhatsAppStorage, 
  WhatsAppMessageRecord, 
  WhatsAppConversation 
} from 'whatsapp-business-api-nextjs';

export class PostgresStorage implements IWhatsAppStorage {
  async saveMessage(record: WhatsAppMessageRecord): Promise<void> {
    await db.messages.create({ data: record });
  }

  async updateMessageStatus(
    waMessageId: string, 
    status: string, 
    timestamp: Date
  ): Promise<void> {
    await db.messages.update({
      where: { waMessageId },
      data: { status, updatedAt: timestamp },
    });
  }

  async getHistory(
    customerNumber: string, 
    phoneNumberId: string
  ): Promise<WhatsAppMessageRecord[]> {
    return db.messages.findMany({
      where: { customerNumber, phoneNumberId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getConversations(phoneNumberId: string): Promise<WhatsAppConversation[]> {
    const messages = await db.messages.findMany({
      where: { phoneNumberId },
      distinct: ['customerNumber'],
      orderBy: { timestamp: 'desc' },
    });
    
    return messages.map(m => ({
      customerNumber: m.customerNumber,
      phoneNumberId: m.phoneNumberId,
      lastMessage: m.content,
      lastMessageTime: m.timestamp,
      unreadCount: 0,
    }));
  }
}
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `WA_ACCESS_TOKEN` | Yes | Meta API access token |
| `WA_ACCOUNT_ID` | Yes | WhatsApp Business Account ID |
| `WA_VERIFY_TOKEN` | Yes | Webhook verification token (you create this) |
| `WA_APP_SECRET` | Yes | Meta App Secret (for webhook signature verification) |
| `NEXT_PUBLIC_WA_ACCOUNT_ID` | Yes | Account ID (for client-side) |

## Roadmap

- [ ] Demo app authentication (NextAuth.js)
- [ ] Persistent database option (PostgreSQL)
- [ ] Media message handling (download/upload)
- [ ] Message reactions
- [ ] Read receipts UI
- [ ] Typing indicators
- [ ] Contact and location messages
- [ ] Interactive messages (lists, buttons)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm run test:run`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Repository Structure

```
whatsappb-next/
├── app/
│   ├── expressjs_demo_app/           # Express API demo
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── db/                  # Prisma and storage helpers
│   │   │   ├── lib/                 # WhatsApp client wiring
│   │   │   └── routes/              # REST endpoints (api, webhook)
│   │   ├── deploy.sh
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── nextjs_demo_app/             # Next.js dashboard demo
│       ├── lib/
│       ├── pages/
│       │   └── api/whatsapp/        # Proxy + debug API routes
│       ├── styles/
│       ├── next-env.d.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── whatsappb-next/               # Publishable core library
│       ├── src/
│       │   ├── components/          # React chat UI widgets
│       │   ├── core/                # Client, handlers, tests
│       │   ├── db/                  # Storage interfaces
│       │   └── styles/              # WhatsApp-inspired CSS
│       ├── LICENSE
│       ├── README.md
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── LICENSE
├── package.json
└── README.md
```

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](./LICENSE) file for details.

## Author

Stefan Chetan ([@stefanche](https://github.com/stefanche))

## Links

- [npm Package](https://www.npmjs.com/package/whatsapp-business-api-nextjs)
- [GitHub Repository](https://github.com/stefanche/whatsappb-next)
- [Issues](https://github.com/stefanche/whatsappb-next/issues)
- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)