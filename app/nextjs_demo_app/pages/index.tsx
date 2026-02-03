import React, { useState } from 'react';
import { 
  PhoneSelector,
  ConversationList,
  MessageHistory,
  MessageComposer,
  TemplatePicker, 
  TemplateForm,
  useWhatsApp,
  useMessageRefresh
} from 'whatsappb-next';
import { WhatsAppTemplate, WhatsAppConversation } from 'whatsappb-next';

export default function Home() {
  const { client, activePhone, isLoading } = useWhatsApp();
  
  // Conversation state
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newCustomerNumber, setNewCustomerNumber] = useState('');
  
  // Template state
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplate | null>(null);
  
  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  const [debugMessages, setDebugMessages] = useState<any[]>([]);
  
  // Refresh trigger for messages
  const { refreshTrigger, refreshMessages } = useMessageRefresh();
  
  // Refresh trigger for conversations
  const [conversationRefresh, setConversationRefresh] = useState(0);
  const refreshConversations = () => setConversationRefresh(prev => prev + 1);

  const handleSelectConversation = (conv: WhatsAppConversation) => {
    setSelectedConversation(conv);
    setShowNewConversation(false);
  };

  const handleNewConversation = () => {
    setShowNewConversation(true);
    setSelectedConversation(null);
  };

  const handleStartConversation = () => {
    if (!newCustomerNumber.trim() || !activePhone) return;
    
    // Create a new conversation object
    setSelectedConversation({
      customerNumber: newCustomerNumber.trim(),
      phoneNumberId: activePhone.phoneNumberId,
      lastMessage: '',
      lastMessageTime: new Date(),
      unreadCount: 0
    });
    setShowNewConversation(false);
    setNewCustomerNumber('');
  };

  const handleMessageSent = () => {
    refreshMessages();
    refreshConversations();
  };

  const handleSendTemplate = async (to: string, components: any[]) => {
    if (!activePhone) {
      alert("No phone number selected.");
      return;
    }

    try {
      await client.sendTemplate({
        fromPhoneNumberId: activePhone.phoneNumberId,
        to: to,
        templateName: activeTemplate!.name,
        languageCode: activeTemplate!.language,
        components: components,
        // Include the template structure to save a snapshot of what was sent
        templateSnapshot: activeTemplate!
      });
      
      alert(`Template "${activeTemplate!.name}" sent!`);
      setActiveTemplate(null);
      setShowTemplates(false);
      handleMessageSent();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  const handleDebugDb = async () => {
    try {
      const response = await fetch('/api/whatsapp/debug');
      const data = await response.json();
      setDebugMessages(data.messages || []);
      setShowDebug(true);
    } catch (err) {
      console.error('Failed to fetch debug data:', err);
    }
  };

  if (isLoading && !activePhone) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Syncing with Meta...</div>;
  }

  return (
    <div className="demo-layout">
      {/* Left Sidebar */}
      <div className="demo-sidebar">
        {/* Header with Phone Selector */}
        <div className="demo-sidebar-header">
          <h2>WhatsAppB</h2>
          <PhoneSelector label="Business Phone:" className="wa-phone-selector-header" />
          <button className="demo-debug-btn" onClick={handleDebugDb}>
            🔍 Debug DB
          </button>
        </div>

        {/* Conversation List */}
        <ConversationList
          key={conversationRefresh}
          selectedCustomerNumber={selectedConversation?.customerNumber}
          onSelectConversation={handleSelectConversation}
          showNewConversationButton={true}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div className="demo-main">
        {showNewConversation ? (
          /* New Conversation Form */
          <div className="demo-new-conversation">
            <h3>Start New Conversation</h3>
            <input
              type="text"
              placeholder="Enter phone number (e.g., 40722112233)"
              value={newCustomerNumber}
              onChange={(e) => setNewCustomerNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartConversation()}
            />
            <div className="demo-new-conversation-actions">
              <button onClick={() => setShowNewConversation(false)}>Cancel</button>
              <button className="primary" onClick={handleStartConversation}>
                Start Chat
              </button>
            </div>
          </div>
        ) : selectedConversation ? (
          /* Chat View */
          <div className="demo-chat">
            {/* Chat Header */}
            <div className="demo-chat-header">
              <div className="demo-chat-avatar">
                {selectedConversation.customerNumber.slice(-2)}
              </div>
              <div>
                <div className="demo-chat-name">{selectedConversation.customerNumber}</div>
                <div className="demo-chat-status">
                  {activePhone ? `via ${activePhone.displayNumber}` : 'No phone selected'}
                </div>
              </div>
            </div>

            {/* Message History */}
            <MessageHistory
              customerNumber={selectedConversation.customerNumber}
              refreshTrigger={refreshTrigger}
            />

            {/* Message Composer */}
            <MessageComposer
              customerNumber={selectedConversation.customerNumber}
              onMessageSent={handleMessageSent}
              onOpenTemplatePicker={() => setShowTemplates(true)}
            />
          </div>
        ) : (
          /* Empty State */
          <div className="demo-empty">
            <div className="demo-empty-icon">💬</div>
            <h3>Welcome to WhatsAppB</h3>
            <p>Select a conversation or start a new one</p>
          </div>
        )}

        {/* Template Modal */}
        {showTemplates && selectedConversation && (
          <div className="demo-modal-overlay" onClick={() => setShowTemplates(false)}>
            <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
              <div className="demo-modal-header">
                <h3>{activeTemplate ? 'Configure Template' : 'Select Template'}</h3>
                <button onClick={() => { setShowTemplates(false); setActiveTemplate(null); }}>✕</button>
              </div>
              <div className="demo-modal-body">
                {activeTemplate ? (
                  <TemplateForm 
                    template={activeTemplate}
                    initialCustomerNumber={selectedConversation.customerNumber}
                    onCancel={() => setActiveTemplate(null)}
                    onSend={handleSendTemplate}
                  />
                ) : (
                  <TemplatePicker onSelect={(tpl) => setActiveTemplate(tpl)} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Debug Modal */}
        {showDebug && (
          <div className="demo-modal-overlay" onClick={() => setShowDebug(false)}>
            <div className="demo-modal demo-modal-wide" onClick={(e) => e.stopPropagation()}>
              <div className="demo-modal-header">
                <h3>Database Debug ({debugMessages.length} messages)</h3>
                <button onClick={() => setShowDebug(false)}>✕</button>
              </div>
              <div className="demo-modal-body">
                {debugMessages.length === 0 ? (
                  <p>No messages in database</p>
                ) : (
                  <table className="demo-debug-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Direction</th>
                        <th>Phone ID</th>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Content</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debugMessages.map((msg, i) => (
                        <tr key={i}>
                          <td>{new Date(msg.timestamp).toLocaleString()}</td>
                          <td>{msg.direction}</td>
                          <td>{msg.phoneNumberId?.slice(-6)}</td>
                          <td>{msg.customerNumber}</td>
                          <td>{msg.type}</td>
                          <td className="demo-debug-content">{msg.content}</td>
                          <td>{msg.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        
        .demo-layout {
          display: flex;
          height: 100vh;
          background: #f0f2f5;
        }
        
        /* Sidebar */
        .demo-sidebar {
          width: 350px;
          display: flex;
          flex-direction: column;
          background: white;
          border-right: 1px solid #e9edef;
        }
        
        .demo-sidebar-header {
          padding: 16px;
          background: #075e54;
          color: white;
        }
        
        .demo-sidebar-header h2 {
          margin: 0 0 12px 0;
          font-size: 20px;
        }
        
        .demo-debug-btn {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          width: 100%;
        }
        
        .demo-debug-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        
        /* Main Area */
        .demo-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        /* Empty State */
        .demo-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #667781;
        }
        
        .demo-empty-icon {
          font-size: 80px;
          margin-bottom: 20px;
        }
        
        .demo-empty h3 {
          margin: 0 0 8px 0;
          color: #41525d;
        }
        
        .demo-empty p {
          margin: 0;
        }
        
        /* New Conversation */
        .demo-new-conversation {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        
        .demo-new-conversation h3 {
          margin: 0 0 20px 0;
        }
        
        .demo-new-conversation input {
          width: 100%;
          max-width: 400px;
          padding: 12px 16px;
          border: 1px solid #e9edef;
          border-radius: 8px;
          font-size: 16px;
          margin-bottom: 16px;
        }
        
        .demo-new-conversation-actions {
          display: flex;
          gap: 12px;
        }
        
        .demo-new-conversation-actions button {
          padding: 10px 24px;
          border: 1px solid #e9edef;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .demo-new-conversation-actions button.primary {
          background: #00a884;
          border-color: #00a884;
          color: white;
        }
        
        /* Chat View */
        .demo-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .demo-chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #075e54;
          color: white;
        }
        
        .demo-chat-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #128c7e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        
        .demo-chat-name {
          font-weight: 600;
        }
        
        .demo-chat-status {
          font-size: 12px;
          opacity: 0.8;
        }
        
        /* Modal */
        .demo-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        
        .demo-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .demo-modal-wide {
          max-width: 900px;
        }
        
        .demo-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e9edef;
        }
        
        .demo-modal-header h3 {
          margin: 0;
        }
        
        .demo-modal-header button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #667781;
        }
        
        .demo-modal-body {
          padding: 20px;
          overflow-y: auto;
        }
        
        /* Debug Table */
        .demo-debug-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        
        .demo-debug-table th,
        .demo-debug-table td {
          padding: 8px;
          border: 1px solid #e9edef;
          text-align: left;
        }
        
        .demo-debug-table th {
          background: #f5f6f6;
          font-weight: 600;
        }
        
        .demo-debug-content {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Phone Selector Header Overrides */
        .wa-phone-selector-header .wa-phone-selector-label { color: rgba(255,255,255,0.8); font-size: 11px; }
        .wa-phone-selector-header .wa-phone-select { 
          background: rgba(255,255,255,0.15); 
          border-color: rgba(255,255,255,0.3); 
          color: white;
          width: 100%;
        }
        .wa-phone-selector-header .wa-phone-select:hover,
        .wa-phone-selector-header .wa-phone-select:focus { 
          border-color: rgba(255,255,255,0.6); 
          background: rgba(255,255,255,0.25);
        }
        .wa-phone-selector-header .wa-phone-select option { color: #111b21; }
        
        /* Form Fields */
        .wa-field { margin-bottom: 15px; }
        .wa-field label { display: block; font-size: 12px; font-weight: bold; margin-bottom: 5px; }
        .wa-field input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .wa-btn-primary { background: #25D366; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
        .wa-template-item { width: 100%; text-align: left; padding: 10px; margin-bottom: 5px; cursor: pointer; border: 1px solid #eee; }
      `}</style>
    </div>
  );
}