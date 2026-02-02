import type { AppProps } from 'next/app';
import { WhatsAppProvider, WhatsAppClient } from 'whatsappb-next';
import '../styles/globals.css';
import 'whatsappb-next/src/styles/whatsapp.css';

// Frontend Client: NO TOKENS, just the Proxy URL
const client = new WhatsAppClient(
  { accessToken: '', accountId: '', verifyToken: '', phones: [] }, 
  undefined, 
  '/api/whatsapp/proxy' // Only this matters
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WhatsAppProvider client={client}>
      <Component {...pageProps} />
    </WhatsAppProvider>
  );
}