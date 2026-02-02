import React from 'react';
import { WhatsAppMessageRecord } from '../db/types';

export const MessageBubble = ({ message }: { message: WhatsAppMessageRecord }) => {
  const isOutbound = message.direction === 'outbound';
  return (
    <div className={`wa-bubble-wrapper ${isOutbound ? 'outbound' : 'inbound'}`}>
      <div className={`wa-bubble ${isOutbound ? 'outbound' : 'inbound'}`}>
        <p>{message.content}</p>
        <div className="wa-bubble-meta">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isOutbound && <span className={`wa-status-check ${message.status}`}>
            {message.status === 'read' ? '✓✓' : '✓'}
          </span>}
        </div>
      </div>
    </div>
  );
};