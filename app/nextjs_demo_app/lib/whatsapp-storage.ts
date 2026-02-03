import { IWhatsAppStorage, WhatsAppMessageRecord, MessageStatus, WhatsAppConversation } from 'whatsappb-next';

// This acts as a temporary database
class InMemoryStorage implements IWhatsAppStorage {
  private messages: WhatsAppMessageRecord[] = [];

  async saveMessage(msg: WhatsAppMessageRecord) {
    this.messages.push(msg);
    console.log('📦 [MemoryDB] Saved:', msg.content);
  }

  async updateStatus(wamid: string, status: MessageStatus) {
    const index = this.messages.findIndex(m => m.wamid === wamid);
    if (index !== -1) {
      this.messages[index].status = status;
      console.log(`📈 [MemoryDB] Status update for ${wamid}: ${status}`);
    }
  }

  async getHistory(customerNumber: string, phoneNumberId: string): Promise<WhatsAppMessageRecord[]> {
    return this.messages
      .filter(m => m.customerNumber === customerNumber && m.phoneNumberId === phoneNumberId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getConversations(phoneNumberId: string): Promise<WhatsAppConversation[]> {
    // Group messages by customerNumber for this phoneNumberId
    const conversationMap = new Map<string, WhatsAppMessageRecord[]>();
    
    for (const msg of this.messages) {
      if (msg.phoneNumberId === phoneNumberId) {
        const existing = conversationMap.get(msg.customerNumber) || [];
        existing.push(msg);
        conversationMap.set(msg.customerNumber, existing);
      }
    }

    // Convert to WhatsAppConversation format
    const conversations: WhatsAppConversation[] = [];
    
    for (const [customerNumber, msgs] of conversationMap) {
      // Sort messages by time to get the last one
      const sortedMsgs = msgs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const lastMsg = sortedMsgs[0];
      
      // Count unread (inbound messages that are not 'read')
      const unreadCount = msgs.filter(m => 
        m.direction === 'inbound' && m.status !== 'read'
      ).length;

      conversations.push({
        customerNumber,
        phoneNumberId,
        lastMessage: lastMsg.content,
        lastMessageTime: lastMsg.timestamp,
        unreadCount
      });
    }

    // Sort by last message time (most recent first)
    return conversations.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }

  // Debug method to get all messages
  getAllMessages(): WhatsAppMessageRecord[] {
    return [...this.messages];
  }

  // Debug method to clear all messages
  clearAll() {
    this.messages = [];
    console.log('🗑️ [MemoryDB] Cleared all messages');
  }
}

export const memoryDb = new InMemoryStorage();