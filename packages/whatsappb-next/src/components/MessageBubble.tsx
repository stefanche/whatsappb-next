import React from 'react';
import { WhatsAppMessageRecord } from '../db/types';

interface TemplateButton {
  text: string;
  type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
  url?: string;
  phoneNumber?: string;
}

/**
 * Formats text with basic WhatsApp-style formatting:
 * *bold* -> <strong>
 * _italic_ -> <em>
 */
const formatText = (text: string): React.ReactNode => {
  // Split by newlines first
  const lines = text.split('\n');
  
  return lines.map((line, lineIdx) => {
    // Process bold (*text*) and italic (_text_)
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;
    
    while (remaining.length > 0) {
      // Check for bold
      const boldMatch = remaining.match(/\*([^*]+)\*/);
      // Check for italic
      const italicMatch = remaining.match(/_([^_]+)_/);
      
      // Find which comes first
      const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
      const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : -1;
      
      if (boldIdx === -1 && italicIdx === -1) {
        // No more formatting
        parts.push(remaining);
        break;
      }
      
      // Process whichever comes first
      if (boldIdx !== -1 && (italicIdx === -1 || boldIdx < italicIdx)) {
        // Add text before bold
        if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
        parts.push(<strong key={keyIdx++}>{boldMatch![1]}</strong>);
        remaining = remaining.slice(boldIdx + boldMatch![0].length);
      } else if (italicIdx !== -1) {
        // Add text before italic
        if (italicIdx > 0) parts.push(remaining.slice(0, italicIdx));
        parts.push(<em key={keyIdx++}>{italicMatch![1]}</em>);
        remaining = remaining.slice(italicIdx + italicMatch![0].length);
      }
    }
    
    // Add line break between lines (except last)
    if (lineIdx < lines.length - 1) {
      parts.push(<br key={`br-${lineIdx}`} />);
    }
    
    return <React.Fragment key={lineIdx}>{parts}</React.Fragment>;
  });
};

export const MessageBubble = ({ message }: { message: WhatsAppMessageRecord }) => {
  const isOutbound = message.direction === 'outbound';
  const buttons: TemplateButton[] = message.metadata?.buttons || [];
  
  const handleButtonClick = (button: TemplateButton) => {
    if (button.type === 'URL' && button.url) {
      window.open(button.url, '_blank', 'noopener,noreferrer');
    } else if (button.type === 'PHONE_NUMBER' && button.phoneNumber) {
      window.location.href = `tel:${button.phoneNumber}`;
    }
  };

  return (
    <div className={`wa-bubble-wrapper ${isOutbound ? 'outbound' : 'inbound'}`}>
      <div className={`wa-bubble ${isOutbound ? 'outbound' : 'inbound'} ${message.type === 'template' ? 'wa-bubble-template' : ''}`}>
        <div className="wa-bubble-content">
          {formatText(message.content)}
        </div>
        
        {/* Render buttons for template messages */}
        {buttons.length > 0 && (
          <div className="wa-bubble-buttons">
            {buttons.map((btn, idx) => (
              <button
                key={idx}
                className={`wa-bubble-btn ${btn.type === 'URL' ? 'wa-bubble-btn-url' : ''}`}
                onClick={() => handleButtonClick(btn)}
              >
                {btn.type === 'URL' && <span className="wa-btn-icon">🔗</span>}
                {btn.type === 'PHONE_NUMBER' && <span className="wa-btn-icon">📞</span>}
                {btn.text}
              </button>
            ))}
          </div>
        )}
        
        <div className="wa-bubble-meta">
          {message.type === 'template' && (
            <span className="wa-template-badge">📋 Template</span>
          )}
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isOutbound && <span className={`wa-status-check ${message.status}`}>
            {message.status === 'read' ? '✓✓' : '✓'}
          </span>}
        </div>
      </div>
    </div>
  );
};