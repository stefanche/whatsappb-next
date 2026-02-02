import React, { useState, useEffect } from 'react';
import { WhatsAppTemplate } from '../core/types';

interface TemplateFormProps {
  template: WhatsAppTemplate;
  initialCustomerNumber?: string;
  onSend: (to: string, components: any[]) => void;
  onCancel: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ template, initialCustomerNumber, onSend, onCancel }) => {
  const [targetNumber, setTargetNumber] = useState(initialCustomerNumber || '');
  const [params, setParams] = useState<{ [key: string]: any }>({
    header: {},
    body: {},
    button: {} // To handle dynamic URLs like your Stripe/Oblio links
  });

  // Helper to count variables in a string
  const getVarCount = (text?: string) => (text?.match(/{{[0-9]+}}/g) || []).length;

  const handleParamChange = (section: string, index: number, value: string) => {
    setParams(prev => ({
      ...prev,
      [section]: { ...prev[section], [index]: value }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const components: any[] = [];

    template.components.forEach((comp) => {
      // 1. Handle Header (Media or Text with vars)
      if (comp.type === 'HEADER') {
        if (comp.format === 'DOCUMENT' || comp.format === 'IMAGE') {
          components.push({
            type: 'header',
            parameters: [{ type: comp.format.toLowerCase(), [comp.format.toLowerCase()]: { id: params.header[1], filename: 'document.pdf' } }]
          });
        } else if (comp.format === 'TEXT' && getVarCount(comp.text) > 0) {
          components.push({
            type: 'header',
            parameters: [{ type: 'text', text: params.header[1] }]
          });
        }
      }

      // 2. Handle Body Variables
      if (comp.type === 'BODY') {
        const count = getVarCount(comp.text);
        if (count > 0) {
          components.push({
            type: 'body',
            parameters: Array.from({ length: count }).map((_, i) => ({
              type: 'text',
              text: params.body[i + 1] || ''
            }))
          });
        }
      }

      // 3. Handle Dynamic Buttons (URL variables like in your Stripe/Oblio templates)
      if (comp.type === 'BUTTONS') {
        comp.buttons?.forEach((btn: any, btnIdx: number) => {
          if (btn.type === 'URL' && getVarCount(btn.url) > 0) {
            components.push({
              type: 'button',
              sub_type: 'url',
              index: btnIdx.toString(),
              parameters: [{ type: 'text', text: params.button[btnIdx] || '' }]
            });
          }
        });
      }
    });

    onSend(targetNumber, components);
  };

  return (
    <form onSubmit={handleSubmit} className="wa-template-form">
      <div className="wa-field">
        <label>Recipient Phone Number</label>
        <input 
          type="text" 
          value={targetNumber} 
          onChange={(e) => setTargetNumber(e.target.value)} 
          placeholder="e.g. 40722112233"
          required
        />
      </div>

      <hr />

      {template.components.map((comp, idx) => {
        // Render Media Input
        if (comp.type === 'HEADER' && (comp.format === 'DOCUMENT' || comp.format === 'IMAGE')) {
          return (
            <div key={idx} className="wa-field">
              <label>Header {comp.format} (Meta Media ID)</label>
              <input type="text" onChange={(e) => handleParamChange('header', 1, e.target.value)} required />
            </div>
          );
        }

        // Render Body Variable Inputs
        if (comp.type === 'BODY') {
          const count = getVarCount(comp.text);
          return Array.from({ length: count }).map((_, i) => (
            <div key={`body-${i}`} className="wa-field">
              <label>Body Variable {"{{"}{i + 1}{"}}"}</label>
              <input type="text" onChange={(e) => handleParamChange('body', i + 1, e.target.value)} required />
            </div>
          ));
        }

        // Render Button URL Variable Inputs (for your Stripe/Oblio links)
        if (comp.type === 'BUTTONS') {
          return comp.buttons.map((btn: any, btnIdx: number) => {
            if (btn.type === 'URL' && getVarCount(btn.url) > 0) {
              return (
                <div key={`btn-${btnIdx}`} className="wa-field">
                  <label>Button URL Suffix (for {btn.text})</label>
                  <input type="text" placeholder="e.g. cs_test_..." onChange={(e) => handleParamChange('button', btnIdx, e.target.value)} required />
                </div>
              );
            }
            return null;
          });
        }
        return null;
      })}

      <div className="wa-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="wa-btn-primary">Send Template</button>
      </div>
    </form>
  );
};