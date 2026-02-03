import React, { useState, useEffect, useRef } from 'react';
import { useWhatsApp } from './WhatsAppProvider.js';
import { MessageBubble } from './MessageBubble.js';
import { WhatsAppMessageRecord } from '../db/types.js';

interface WhatsAppChatWindowProps {
  customerNumber: string;
  /** Optional callback after a message is sent */
  onMessageSent?: () => void;
}

export const WhatsAppChatWindow: React.FC<WhatsAppChatWindowProps> = ({ 
  customerNumber,
  onMessageSent 
}) => {
  const { client, activePhone } = useWhatsApp();
  const [messages, setMessages] = useState<WhatsAppMessageRecord[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch message history
  const fetchMessages = async () => {
    if (!activePhone) return;
    
    try {
      const history = await client.getMessages(customerNumber, activePhone.phoneNumberId);
      setMessages(history);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages on mount and when customer changes
  useEffect(() => {
    setIsLoading(true);
    fetchMessages();
  }, [customerNumber, activePhone?.phoneNumberId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !activePhone) return;
    
    setIsSending(true);
    try {
      await client.sendText({
        fromPhoneNumberId: activePhone.phoneNumberId,
        to: customerNumber,
        body: message
      });
      setMessage('');
      // Refresh messages to show the sent message
      await fetchMessages();
      onMessageSent?.();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert("Failed to send message. Check console.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="wa-chat-container">
      {/* Header */}
      <div className="wa-header">
        <div className="wa-avatar">WA</div>
        <div>
          <div className="wa-contact-name">{customerNumber}</div>
          <div className="wa-status">{activePhone ? `Sending from: ${activePhone.displayNumber}` : 'No phone selected'}</div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="wa-messages-area">
        {isLoading ? (
          <div className="wa-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="wa-empty">No messages yet. Start a conversation!</div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.wamid} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="wa-input-footer">
        <input 
          type="text" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={activePhone ? "Type a message" : "Select a phone number first"}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={!activePhone}
        />
        <button onClick={handleSend} disabled={isSending || !activePhone}>
          {isSending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};