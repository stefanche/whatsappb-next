import React, { useState, useEffect } from 'react';
import { useWhatsApp } from './WhatsAppProvider.js';
import { WhatsAppConversation } from '../db/types.js';

interface ConversationListProps {
  /** Currently selected conversation's customer number */
  selectedCustomerNumber?: string;
  /** Callback when a conversation is selected */
  onSelectConversation: (conversation: WhatsAppConversation) => void;
  /** Optional: Show a button to start a new conversation */
  showNewConversationButton?: boolean;
  /** Callback when new conversation button is clicked */
  onNewConversation?: () => void;
}

/**
 * ConversationList - Displays a list of conversations for the selected WhatsApp Business phone.
 * Automatically fetches conversations when the active phone changes.
 */
export const ConversationList: React.FC<ConversationListProps> = ({
  selectedCustomerNumber,
  onSelectConversation,
  showNewConversationButton = true,
  onNewConversation
}) => {
  const { client, activePhone, isLoading: isPhoneLoading } = useWhatsApp();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations when active phone changes
  useEffect(() => {
    if (!activePhone) {
      setConversations([]);
      return;
    }

    const fetchConversations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.getConversations(activePhone.phoneNumberId);
        setConversations(result);
      } catch (err: any) {
        console.error('Failed to fetch conversations:', err);
        setError(err.message || 'Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [activePhone?.phoneNumberId]);

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isPhoneLoading) {
    return (
      <div className="wa-conversation-list">
        <div className="wa-conversation-loading">Loading...</div>
      </div>
    );
  }

  if (!activePhone) {
    return (
      <div className="wa-conversation-list">
        <div className="wa-conversation-empty">Select a phone number first</div>
      </div>
    );
  }

  return (
    <div className="wa-conversation-list">
      {/* New Conversation Button */}
      {showNewConversationButton && onNewConversation && (
        <button 
          className="wa-new-conversation-btn"
          onClick={onNewConversation}
        >
          + New Conversation
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="wa-conversation-loading">Loading conversations...</div>
      )}

      {/* Error State */}
      {error && (
        <div className="wa-conversation-error">{error}</div>
      )}

      {/* Empty State */}
      {!isLoading && !error && conversations.length === 0 && (
        <div className="wa-conversation-empty">
          No conversations yet
        </div>
      )}

      {/* Conversation Items */}
      {!isLoading && conversations.map((conv) => (
        <div
          key={`${conv.phoneNumberId}-${conv.customerNumber}`}
          className={`wa-conversation-item ${
            selectedCustomerNumber === conv.customerNumber ? 'selected' : ''
          }`}
          onClick={() => onSelectConversation(conv)}
        >
          <div className="wa-conversation-avatar">
            {conv.customerNumber.slice(-2)}
          </div>
          <div className="wa-conversation-details">
            <div className="wa-conversation-header">
              <span className="wa-conversation-name">{conv.customerNumber}</span>
              <span className="wa-conversation-time">{formatTime(conv.lastMessageTime)}</span>
            </div>
            <div className="wa-conversation-preview">
              <span className="wa-conversation-last-message">{conv.lastMessage}</span>
              {conv.unreadCount > 0 && (
                <span className="wa-conversation-unread">{conv.unreadCount}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
