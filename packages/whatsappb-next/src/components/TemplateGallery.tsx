import React from 'react';
import { WhatsAppTemplate } from '../core/types/index.js';

export const TemplateGallery = ({ templates, onSelect, loading }: { 
  templates: WhatsAppTemplate[]; 
  onSelect: (t: WhatsAppTemplate) => void; 
  loading?: boolean 
}) => {
  if (loading) return <div className="wa-loading">Loading templates...</div>;
  return (
    <div className="wa-template-grid">
      {templates.map(t => (
        <div key={t.id} className={`wa-template-card ${t.status.toLowerCase()}`} onClick={() => onSelect(t)}>
          <span className="wa-category-tag">{t.category}</span>
          <h4>{t.name}</h4>
          <div className="wa-card-footer">
            <span>{t.language}</span>
            <span className="wa-status-dot">● {t.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
};