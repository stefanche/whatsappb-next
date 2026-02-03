import React from 'react';
import { WhatsAppPhoneConfig } from '../core/types/index.js';
import { useWhatsApp } from './WhatsAppProvider.js';

interface PhoneSelectorProps {
  /** Optional: Override phones from context */
  phones?: WhatsAppPhoneConfig[];
  /** Optional: Override selected phone ID from context */
  selectedId?: string;
  /** Optional: Override selection handler from context */
  onSelect?: (phone: WhatsAppPhoneConfig) => void;
  /** Optional: Additional CSS class */
  className?: string;
  /** Optional: Disable the selector */
  disabled?: boolean;
  /** Optional: Show loading state */
  showLoading?: boolean;
  /** Optional: Label to display above the selector */
  label?: string;
}

/**
 * PhoneSelector - A component for selecting the WhatsApp phone number to use for sending messages.
 * 
 * Can be used in two ways:
 * 1. Connected mode (default): Automatically uses phones and activePhone from WhatsAppProvider context
 * 2. Controlled mode: Pass phones, selectedId, and onSelect props to override context
 * 
 * @example
 * // Connected mode - uses context automatically
 * <PhoneSelector />
 * 
 * @example
 * // Connected mode with label
 * <PhoneSelector label="Send from:" />
 * 
 * @example
 * // Controlled mode - manual control
 * <PhoneSelector 
 *   phones={myPhones} 
 *   selectedId={selectedPhoneId} 
 *   onSelect={(phone) => setSelectedPhoneId(phone.phoneNumberId)} 
 * />
 */
export const PhoneSelector: React.FC<PhoneSelectorProps> = ({ 
  phones: phonesProp, 
  selectedId: selectedIdProp, 
  onSelect: onSelectProp,
  className = '',
  disabled = false,
  showLoading = true,
  label
}) => {
  const context = useWhatsApp();
  
  // Use props if provided, otherwise fall back to context
  const phones = phonesProp ?? context.phones;
  const selectedId = selectedIdProp ?? context.activePhone?.phoneNumberId ?? '';
  const isLoading = context.isLoading;

  const handleSelect = (phoneNumberId: string) => {
    const selectedPhone = phones.find(p => p.phoneNumberId === phoneNumberId);
    if (selectedPhone) {
      if (onSelectProp) {
        onSelectProp(selectedPhone);
      } else {
        context.setActivePhone(selectedPhone);
      }
    }
  };

  if (showLoading && isLoading) {
    return (
      <div className={`wa-phone-selector-container ${className}`}>
        {label && <label className="wa-phone-selector-label">{label}</label>}
        <select className="wa-phone-select wa-phone-select-loading" disabled>
          <option>Loading phones...</option>
        </select>
      </div>
    );
  }

  if (phones.length === 0) {
    return (
      <div className={`wa-phone-selector-container ${className}`}>
        {label && <label className="wa-phone-selector-label">{label}</label>}
        <select className="wa-phone-select wa-phone-select-empty" disabled>
          <option>No phone numbers available</option>
        </select>
      </div>
    );
  }

  return (
    <div className={`wa-phone-selector-container ${className}`}>
      {label && <label className="wa-phone-selector-label">{label}</label>}
      <select 
        value={selectedId} 
        onChange={(e) => handleSelect(e.target.value)}
        className="wa-phone-select"
        disabled={disabled}
      >
        {!selectedId && <option value="">Select a phone number</option>}
        {phones.map(phone => (
          <option key={phone.phoneNumberId} value={phone.phoneNumberId}>
            {phone.label || phone.displayNumber} ({phone.displayNumber})
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Hook to get the currently selected phone for sending messages.
 * Returns the active phone from context.
 * 
 * @example
 * const activePhone = useActivePhone();
 * if (activePhone) {
 *   await client.sendTemplate(activePhone.phoneNumberId, recipientNumber, templateName);
 * }
 */
export const useActivePhone = (): WhatsAppPhoneConfig | null => {
  const { activePhone } = useWhatsApp();
  return activePhone;
};