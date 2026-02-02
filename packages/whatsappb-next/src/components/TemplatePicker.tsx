import React from 'react';
import { useWhatsApp } from './WhatsAppProvider';
import { WhatsAppTemplate } from '../core/types';

interface TemplatePickerProps {
  // Now passes the whole object instead of just a string
  onSelect: (template: WhatsAppTemplate) => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ onSelect }) => {
  const { templates, isLoading } = useWhatsApp();

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="wa-spinner">Loading Meta Templates...</div>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#666' }}>
        No templates found in this WhatsApp Business Account.
      </div>
    );
  }

  return (
    <div className="wa-template-picker">
      {templates.map((tpl) => (
        <button 
          key={tpl.id} 
          onClick={() => onSelect(tpl)} // Returns the full object
          className="wa-template-item"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '12px',
            marginBottom: '8px',
            border: '1px solid #eee',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{tpl.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
              {tpl.category}
            </span>
            <span style={{ fontSize: '11px', background: '#e1f5fe', padding: '2px 6px', borderRadius: '4px' }}>
              {tpl.language}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};