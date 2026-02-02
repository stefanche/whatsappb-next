import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WhatsAppClient } from '../core/client';
import { WhatsAppTemplate, WhatsAppPhoneConfig } from '../core/types';

interface WhatsAppContextType {
  client: WhatsAppClient;
  templates: WhatsAppTemplate[];
  phones: WhatsAppPhoneConfig[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

export const WhatsAppProvider = ({ client, children }: { client: WhatsAppClient; children: ReactNode }) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [phones, setPhones] = useState<WhatsAppPhoneConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, pRes] = await Promise.all([client.getTemplates(), client.getPhoneNumbers()]);
      setTemplates(tRes.data);
      setPhones(pRes.data);
    } catch (err) {
      console.error("WhatsAppProvider Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [client]);

  return (
    <WhatsAppContext.Provider value={{ client, templates, phones, isLoading, refresh: fetchData }}>
      {children}
    </WhatsAppContext.Provider>
  );
};

export const useWhatsApp = () => {
  const context = useContext(WhatsAppContext);
  if (!context) throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  return context;
};