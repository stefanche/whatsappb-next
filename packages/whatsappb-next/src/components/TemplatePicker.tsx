import React from 'react';
import { useWhatsApp } from './WhatsAppProvider';
import { TemplateGallery } from './TemplateGallery';

export const TemplatePicker = ({ onSelect }: { onSelect: (name: string) => void }) => {
  const { templates, isLoading } = useWhatsApp();

  return (
    <TemplateGallery 
      templates={templates} 
      loading={isLoading} 
      onSelect={(t) => onSelect(t.name)} 
    />
  );
};