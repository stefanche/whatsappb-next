import React, { useState, useEffect, useRef } from 'react';
import { useWhatsApp } from './WhatsAppProvider.js';
import { MessageBubble } from './MessageBubble.js';
import { WhatsAppMessageRecord } from '../db/types.js';

interface MessageHistoryProps {
  /** The customer's phone number */
  customerNumber: string;
  /** Optional: Override phoneNumberId (defaults to activePhone from context) */
  phoneNumberId?: string;
  /** Optional: Callback when messages are loaded */
  onMessagesLoaded?: (messages: WhatsAppMessageRecord[]) => void;
  /** Optional: External trigger to refresh messages */
  refreshTrigger?: number;
}

/**
 * MessageHistory - Displays the message history for a specific conversation.
 * Queries by both customerNumber and phoneNumberId (WhatsApp Business phone).
 */
export const MessageHistory: React.FC<MessageHistoryProps> = ({
  customerNumber,
  phoneNumberId: phoneNumberIdProp,
  onMessagesLoaded,
  refreshTrigger = 0
}) => {
  const { client, activePhone } = useWhatsApp();
  const [messages, setMessages] = useState<WhatsAppMessageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use prop or context for phoneNumberId
  const phoneNumberId = phoneNumberIdProp || activePhone?.phoneNumberId;

  // Fetch messages
  const fetchMessages = async () => {
    if (!customerNumber || !phoneNumberId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const history = await client.getMessages(customerNumber, phoneNumberId);
      setMessages(history);
      onMessagesLoaded?.(history);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages on mount and when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [customerNumber, phoneNumberId, refreshTrigger]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!phoneNumberId) {
    return (
      <div className="wa-message-history">
        <div className="wa-message-history-empty">
          Select a phone number to view messages
        </div>
      </div>
    );
  }

  if (!customerNumber) {
    return (
      <div className="wa-message-history">
        <div className="wa-message-history-empty">
          Select a conversation to view messages
        </div>
      </div>
    );
  }

  return (
    <div className="wa-message-history">
      {/* Loading State */}
      {isLoading && (
        <div className="wa-message-history-loading">Loading messages...</div>
      )}

      {/* Error State */}
      {error && (
        <div className="wa-message-history-error">{error}</div>
      )}

      {/* Empty State */}
      {!isLoading && !error && messages.length === 0 && (
        <div className="wa-message-history-empty">
          No messages yet. Start the conversation!
        </div>
      )}

      {/* Messages */}
      {!isLoading && !error && messages.map((msg) => (
        <MessageBubble key={msg.wamid} message={msg} />
      ))}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

/**
 * Hook to manually refresh message history.
 * Returns a trigger value and a function to increment it.
 */
export const useMessageRefresh = () => {
  const [trigger, setTrigger] = useState(0);
  const refresh = () => setTrigger(prev => prev + 1);
  return { refreshTrigger: trigger, refreshMessages: refresh };
};
