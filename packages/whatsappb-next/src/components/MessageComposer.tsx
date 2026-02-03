import React, { useState, useRef } from 'react';
import { useWhatsApp } from './WhatsAppProvider.js';

type ComposerMode = 'text' | 'image' | 'document' | 'template';

interface MessageComposerProps {
  /** The recipient's phone number */
  customerNumber: string;
  /** Callback after a message is successfully sent */
  onMessageSent?: () => void;
  /** Callback to open template picker */
  onOpenTemplatePicker?: () => void;
  /** Show/hide template button */
  showTemplateButton?: boolean;
}

/**
 * MessageComposer - A component for composing and sending WhatsApp messages.
 * Supports text, image, and document messages with a clean UI.
 */
export const MessageComposer: React.FC<MessageComposerProps> = ({
  customerNumber,
  onMessageSent,
  onOpenTemplatePicker,
  showTemplateButton = true
}) => {
  const { client, activePhone } = useWhatsApp();
  const [mode, setMode] = useState<ComposerMode>('text');
  const [text, setText] = useState('');
  const [mediaId, setMediaId] = useState('');
  const [caption, setCaption] = useState('');
  const [filename, setFilename] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMediaPanel, setShowMediaPanel] = useState(false);

  const isDisabled = !activePhone || !customerNumber;

  const resetForm = () => {
    setText('');
    setMediaId('');
    setCaption('');
    setFilename('');
    setMode('text');
    setShowMediaPanel(false);
  };

  const handleSendText = async () => {
    if (!text.trim() || !activePhone) return;

    setIsSending(true);
    try {
      await client.sendText({
        fromPhoneNumberId: activePhone.phoneNumberId,
        to: customerNumber,
        body: text.trim()
      });
      resetForm();
      onMessageSent?.();
    } catch (err: any) {
      console.error('Failed to send text:', err);
      alert('Failed to send message: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendImage = async () => {
    if (!mediaId.trim() || !activePhone) return;

    setIsSending(true);
    try {
      await client.sendImage({
        fromPhoneNumberId: activePhone.phoneNumberId,
        to: customerNumber,
        image: { id: mediaId.trim(), caption: caption.trim() || undefined }
      });
      resetForm();
      onMessageSent?.();
    } catch (err: any) {
      console.error('Failed to send image:', err);
      alert('Failed to send image: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendDocument = async () => {
    if (!mediaId.trim() || !activePhone) return;

    setIsSending(true);
    try {
      await client.sendDocument({
        fromPhoneNumberId: activePhone.phoneNumberId,
        to: customerNumber,
        document: { 
          id: mediaId.trim(), 
          caption: caption.trim() || undefined,
          filename: filename.trim() || 'document.pdf'
        }
      });
      resetForm();
      onMessageSent?.();
    } catch (err: any) {
      console.error('Failed to send document:', err);
      alert('Failed to send document: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    switch (mode) {
      case 'text':
        handleSendText();
        break;
      case 'image':
        handleSendImage();
        break;
      case 'document':
        handleSendDocument();
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && mode === 'text') {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="wa-message-composer">
      {/* Media Panel (expandable) */}
      {showMediaPanel && (
        <div className="wa-composer-media-panel">
          <div className="wa-composer-media-tabs">
            <button 
              className={`wa-composer-tab ${mode === 'image' ? 'active' : ''}`}
              onClick={() => setMode('image')}
            >
              📷 Image
            </button>
            <button 
              className={`wa-composer-tab ${mode === 'document' ? 'active' : ''}`}
              onClick={() => setMode('document')}
            >
              📄 Document
            </button>
          </div>

          <div className="wa-composer-media-fields">
            <input
              type="text"
              placeholder="Media ID (from Meta upload)"
              value={mediaId}
              onChange={(e) => setMediaId(e.target.value)}
              className="wa-composer-input"
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="wa-composer-input"
            />
            {mode === 'document' && (
              <input
                type="text"
                placeholder="Filename (e.g., invoice.pdf)"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="wa-composer-input"
              />
            )}
            <div className="wa-composer-media-actions">
              <button 
                onClick={() => setShowMediaPanel(false)}
                className="wa-composer-btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={handleSend}
                disabled={!mediaId.trim() || isSending || isDisabled}
                className="wa-composer-btn-send"
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Composer Bar */}
      <div className="wa-composer-bar">
        {/* Attachment Button */}
        <button 
          className="wa-composer-action-btn"
          onClick={() => {
            setShowMediaPanel(!showMediaPanel);
            setMode('image');
          }}
          disabled={isDisabled}
          title="Attach media"
        >
          📎
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? 'Select a phone and conversation' : 'Type a message'}
          disabled={isDisabled || showMediaPanel}
          className="wa-composer-text-input"
        />

        {/* Template Button */}
        {showTemplateButton && onOpenTemplatePicker && (
          <button 
            className="wa-composer-action-btn"
            onClick={onOpenTemplatePicker}
            disabled={isDisabled}
            title="Send template"
          >
            📋
          </button>
        )}

        {/* Send Button */}
        <button 
          className="wa-composer-send-btn"
          onClick={handleSendText}
          disabled={!text.trim() || isSending || isDisabled || showMediaPanel}
        >
          {isSending ? '...' : '➤'}
        </button>
      </div>
    </div>
  );
};
