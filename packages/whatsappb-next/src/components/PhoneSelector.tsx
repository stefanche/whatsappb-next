import React from 'react';
import { WhatsAppPhoneConfig } from '../core/types';

export const PhoneSelector = ({ 
  phones, 
  selectedId, 
  onSelect 
}: { 
  phones: WhatsAppPhoneConfig[], 
  selectedId: string, 
  onSelect: (id: string) => void 
}) => {
  return (
    <select 
      value={selectedId} 
      onChange={(e) => onSelect(e.target.value)}
      className="wa-phone-select"
    >
      {phones.map(phone => (
        <option key={phone.phoneNumberId} value={phone.phoneNumberId}>
          {phone.label || phone.displayNumber} ({phone.displayNumber})
        </option>
      ))}
    </select>
  );
};