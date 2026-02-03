import React, { createContext, useContext, useState, useEffect } from 'react';
import { WhatsAppClient } from '../core/client.js';
import { WhatsAppTemplate, WhatsAppPhoneConfig } from '../core/types/index.js';

interface WhatsAppContextType {
  client: WhatsAppClient;
  templates: WhatsAppTemplate[];
  phones: WhatsAppPhoneConfig[];
  activePhone: WhatsAppPhoneConfig | null; // The currently selected sender
  setActivePhone: (phone: WhatsAppPhoneConfig) => void;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

export const WhatsAppProvider: React.FC<{ client: WhatsAppClient; children: React.ReactNode }> = ({ client, children }) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [phones, setPhones] = useState<WhatsAppPhoneConfig[]>([]);
  const [activePhone, setActivePhone] = useState<WhatsAppPhoneConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetches the latest templates and phone numbers from Meta via your Proxy.
   * Automatically sets the first available phone as the active sender.
   */
  const refreshData = async () => {
    setIsLoading(true);
    try {
      // These calls travel through your /api/whatsapp/proxy
      const [tRes, pRes] = await Promise.all([
        client.getTemplates(),
        client.getPhoneNumbers()
      ]);

      setTemplates(tRes.data || []);
      setPhones(pRes.data || []);

      // Auto-select the first phone number if one isn't already active
      if (pRes.data && pRes.data.length > 0 && !activePhone) {
        setActivePhone(pRes.data[0]);
      }
    } catch (err) {
      console.error("Failed to sync WhatsApp data via proxy:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial sync on mount
  useEffect(() => {
    refreshData();
  }, []);

  return (
    <WhatsAppContext.Provider 
      value={{ 
        client, 
        templates, 
        phones, 
        activePhone, 
        setActivePhone, 
        isLoading, 
        refreshData 
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  );
};

/**
 * Hook to access the WhatsApp context.
 * Provides access to the client, templates, and the active sender phone.
 */
export const useWhatsApp = () => {
  const context = useContext(WhatsAppContext);
  if (!context) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  }
  return context;
};