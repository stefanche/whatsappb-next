import React, { useState, useEffect } from 'react';
import { useWhatsApp } from './WhatsAppProvider';
import { MessageBubble } from './MessageBubble';
import { TemplateGallery } from './TemplateGallery';
import { WhatsAppMessageRecord } from '../db/types';

export const WhatsAppChatWindow = ({ customerNumber, initialHistory = [] }: { 
  customerNumber: string; 
  initialHistory?: WhatsAppMessageRecord[] 
}) => {
  const { client, phones, templates, isLoading } = useWhatsApp();
  const [messages, setMessages] = useState(initialHistory);
  const [text, setText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [activePhoneId, setActivePhoneId] = useState('');

  useEffect(() => { if (phones.length > 0) setActivePhoneId(phones[0].phoneNumberId); }, [phones]);

  const send = async () => {
    if (!text.trim()) return;
    const res = await client.sendText({ fromPhoneNumberId: activePhoneId, to: customerNumber, body: text });
    setMessages([...messages, { 
      wamid: res.messages[0].id, phoneNumberId: activePhoneId, customerNumber, 
      type: 'text', content: text, direction: 'outbound', status: 'sent', timestamp: new Date() 
    }]);
    setText('');
  };

  return (
    <div className="wa-chat-container">
      <div className="wa-chat-header">
        <strong>{customerNumber}</strong>
        <select value={activePhoneId} onChange={e => setActivePhoneId(e.target.value)}>
          {phones.map(p => <option key={p.phoneNumberId} value={p.phoneNumberId}>{p.label || p.displayNumber}</option>)}
        </select>
      </div>

      <div className="wa-message-list">
        {messages.map(m => <MessageBubble key={m.wamid} message={m} />)}
      </div>

      <div className="wa-chat-footer">
        <button onClick={() => setShowTemplates(!showTemplates)}>📄</button>
        {showTemplates && (
          <div className="wa-template-popover">
            <TemplateGallery templates={templates} loading={isLoading} onSelect={(t) => {
              client.sendTemplate({ fromPhoneNumberId: activePhoneId, to: customerNumber, templateName: t.name, languageCode: t.language });
              setShowTemplates(false);
            }} />
          </div>
        )}
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
        <button onClick={send} className="wa-send-btn">Send</button>
      </div>
    </div>
  );
};