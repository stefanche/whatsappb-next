import {
  IWhatsAppStorage,
  WhatsAppMessageRecord,
  MessageStatus,
  WhatsAppConversation,
} from 'whatsapp-business-api-nextjs';
import prisma from './prisma';

export class PostgresStorage implements IWhatsAppStorage {
  
  async saveMessage(msg: WhatsAppMessageRecord): Promise<void> {
    await prisma.whatsAppMessage.upsert({
      where: { wamid: msg.wamid },
      update: {
        status: msg.status,
        metadata: msg.metadata,
        updatedAt: new Date(),
      },
      create: {
        wamid: msg.wamid,
        phoneNumberId: msg.phoneNumberId,
        customerNumber: msg.customerNumber,
        type: msg.type,
        content: msg.content,
        direction: msg.direction,
        status: msg.status,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      },
    });
    console.log('📦 [PostgresDB] Saved message:', msg.wamid);
  }

  async updateStatus(wamid: string, status: MessageStatus): Promise<void> {
    try {
      await prisma.whatsAppMessage.update({
        where: { wamid },
        data: { status },
      });
      console.log(`📈 [PostgresDB] Status update for ${wamid}: ${status}`);
    } catch (error) {
      console.warn(`⚠️ [PostgresDB] Could not update status for ${wamid}: message not found`);
    }
  }

  async getHistory(customerNumber: string, phoneNumberId: string): Promise<WhatsAppMessageRecord[]> {
    const messages = await prisma.whatsAppMessage.findMany({
      where: { customerNumber, phoneNumberId },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map(this.toMessageRecord);
  }

  async getConversations(phoneNumberId: string): Promise<WhatsAppConversation[]> {
    const conversations = await prisma.$queryRaw<Array<{
      customer_number: string;
      phone_number_id: string;
      last_message: string;
      last_message_time: Date;
      unread_count: bigint;
    }>>`
      SELECT 
        customer_number,
        phone_number_id,
        (
          SELECT content FROM whatsapp_messages m2 
          WHERE m2.customer_number = m1.customer_number 
            AND m2.phone_number_id = m1.phone_number_id 
          ORDER BY timestamp DESC LIMIT 1
        ) as last_message,
        MAX(timestamp) as last_message_time,
        COUNT(*) FILTER (WHERE direction = 'inbound' AND status != 'read') as unread_count
      FROM whatsapp_messages m1
      WHERE phone_number_id = ${phoneNumberId}
      GROUP BY customer_number, phone_number_id
      ORDER BY last_message_time DESC
    `;

    return conversations.map(c => ({
      customerNumber: c.customer_number,
      phoneNumberId: c.phone_number_id,
      lastMessage: c.last_message,
      lastMessageTime: c.last_message_time,
      unreadCount: Number(c.unread_count),
    }));
  }

  async logWebhookEvent(eventType: string, payload: unknown): Promise<void> {
    await prisma.webhookEvent.create({
      data: {
        eventType,
        payload: payload as any,
        processed: true,
      },
    });
  }

  private toMessageRecord(msg: any): WhatsAppMessageRecord {
    return {
      wamid: msg.wamid,
      phoneNumberId: msg.phoneNumberId,
      customerNumber: msg.customerNumber,
      type: msg.type as WhatsAppMessageRecord['type'],
      content: msg.content,
      direction: msg.direction as WhatsAppMessageRecord['direction'],
      status: msg.status as MessageStatus,
      timestamp: msg.timestamp,
      metadata: msg.metadata,
    };
  }
}

export const postgresStorage = new PostgresStorage();
