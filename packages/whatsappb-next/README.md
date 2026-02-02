# WhatsApp Business Next.js Library

A full-stack toolkit for integrating WhatsApp Business API into Next.js applications.

## Features
- **Multi-Phone Support**: Manage multiple numbers under one Meta account.
- **Database Agnostic**: Plugin your own Prisma/Drizzle adapter.
- **Ready UI**: Pre-built Chat Windows, Template Galleries, and Hooks.
- **Webhooks**: Automatic handling of incoming messages and status updates.

## Installation
```bash
npm install whatsappb-next
```

## Quick Start

### 1. Initialize Client

```
import { WhatsAppClient } from 'whatsappb-next';

export const waClient = new WhatsAppClient({
  accessToken: process.env.WA_TOKEN!,
  accountId: process.env.WA_WABA_ID!,
  verifyToken: process.env.WA_VERIFY_TOKEN!,
  phones: [{ phoneNumberId: '123...', displayNumber: '1555...' }]
}, dbAdapter); // Your IWhatsAppStorage implementation
```

### 2. Set Up Provider

```
import { WhatsAppProvider } from 'whatsappb-next';
import 'whatsappb-next/dist/styles.css';

export default function RootLayout({ children }) {
  return (
    <WhatsAppProvider client={waClient}>
      {children}
    </WhatsAppProvider>
  );
}
```

### 3. Use Chat Window

```
import { WhatsAppChatWindow } from 'whatsappb-next';

export default function Page() {
  return <WhatsAppChatWindow customerNumber="16505551234" />;
}
```

## Webhook Setup

In your `app/api/whatsapp/route.ts`:

```
import { WhatsAppWebhookHandler } from 'whatsappb-next';

const handler = new WhatsAppWebhookHandler(process.env.WA_VERIFY_TOKEN!, dbAdapter);

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  return new Response(handler.verify(Object.fromEntries(params)));
}

export async function POST(req: Request) {
  const payload = await req.json();
  await handler.handle(payload);
  return new Response("OK");
}
```