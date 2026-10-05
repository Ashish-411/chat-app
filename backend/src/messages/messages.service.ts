import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UpdateMessageDto } from './dto/update-message.dto.js';
import { EventsGateway } from '../events/events.gateway.js';

const publicUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  private async ensureParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { userId, conversationId },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    return participant;
  }

    async sendMessage(
    userId: string,
    conversationId: string,
    dto: CreateMessageDto,
  ) {
    await this.ensureParticipant(userId, conversationId);

    const message = await this.prisma.$transaction(async tx => {
      const createdMessage = await tx.message.create({
        data: {
          content: dto.content,
          type: dto.type ?? 'TEXT', // (Default to TEXT if not provided)
          senderId: userId,
          conversationId,
        },
        include: {
          sender: { select: publicUserSelect },
        },
      });

      // ... rest of the method (receipts, conversation update) remains the same ...

      // Get all OTHER participants (not the sender)
      const otherParticipants = await tx.participant.findMany({
        where: {
          conversationId,
          userId: { not: userId },
        },
        select: { userId: true },
      });

      // Create a receipt for each recipient with status SENT
      if (otherParticipants.length > 0) {
        await tx.messageReceipt.createMany({
          data: otherParticipants.map(p => ({
            messageId: createdMessage.id,
            userId: p.userId,
            status: 'SENT' as any,
          })),
        });
      }

      // Update conversation's updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return createdMessage;
    });

    // Fetch receipts to include in the response
    const receipts = await this.prisma.messageReceipt.findMany({
      where: { messageId: message.id },
      select: {
        userId: true,
        status: true,
        deliveredAt: true,
        readAt: true,
      },
    });

    const messageWithReceipts = { ...message, receipts };

    // Broadcast via Socket.IO
    this.events.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', messageWithReceipts);

    return messageWithReceipts;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    limit: number = 50,
    cursor?: string,
  ) {
    await this.ensureParticipant(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: publicUserSelect },
        receipts: {
          select: {
            userId: true,
            status: true,
            deliveredAt: true,
            readAt: true,
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;

    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    return {
      data: messages,
      nextCursor,
    };
  }

  // --- DELIVERY & READ STATUS ---

  async markAsDelivered(userId: string, messageId: string) {
    const receipt = await this.prisma.messageReceipt.findUnique({
      where: {
        messageId_userId: { messageId, userId },
      },
    });

    if (!receipt || receipt.status === 'READ') {
      return; // Already delivered or read, skip
    }

    const updated = await this.prisma.messageReceipt.update({
      where: {
        messageId_userId: { messageId, userId },
      },
      data: {
        status: 'DELIVERED' as any,
        deliveredAt: new Date(),
      },
    });

    // Get the message to find the conversation
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, senderId: true },
    });

    if (message) {
      // Notify the sender about the status change
      this.events.server
        .to(`user:${message.senderId}`)
        .emit('message:status-update', {
          messageId,
          conversationId: message.conversationId,
          userId,
          status: 'DELIVERED',
          deliveredAt: updated.deliveredAt,
        });
    }

    return updated;
  }

  async markConversationAsRead(userId: string, conversationId: string) {
    await this.ensureParticipant(userId, conversationId);

    // Update all receipts for this user in this conversation to READ
    const updatedReceipts = await this.prisma.messageReceipt.updateMany({
      where: {
        userId,
        status: { not: 'READ' as any },
        message: {
          conversationId,
          senderId: { not: userId }, // Don't mark own messages
        },
      },
      data: {
        status: 'READ' as any,
        readAt: new Date(),
      },
    });

    // Get all message IDs that were updated to notify senders
    const affectedMessages = await this.prisma.messageReceipt.findMany({
      where: {
        userId,
        status: 'READ' as any,
        message: {
          conversationId,
        },
      },
      select: {
        messageId: true,
        message: {
          select: { senderId: true },
        },
      },
    });

    // Group by sender to notify each sender
    const senderIds = [...new Set(affectedMessages.map(r => r.message.senderId))];

    for (const senderId of senderIds) {
      this.events.server.to(`user:${senderId}`).emit('message:status-update', {
        conversationId,
        userId,
        status: 'READ',
        readAt: new Date(),
      });
    }

    return {
      success: true,
      count: updatedReceipts.count,
    };
  }

  async getMessageReceipts(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureParticipant(userId, message.conversationId);

    return this.prisma.messageReceipt.findMany({
      where: { messageId },
      select: {
        userId: true,
        status: true,
        deliveredAt: true,
        readAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  // --- EDIT & DELETE (unchanged) ---

  async updateMessage(
    userId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new ForbiddenException('You can only edit your own messages');

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content },
      include: {
        sender: { select: publicUserSelect },
        receipts: {
          select: { userId: true, status: true, deliveredAt: true, readAt: true },
        },
      },
    });

    this.events.server
      .to(`conversation:${updatedMessage.conversationId}`)
      .emit('message:updated', updatedMessage);

    return updatedMessage;
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new ForbiddenException('You can only delete your own messages');

    await this.prisma.message.delete({ where: { id: messageId } });

    this.events.server
      .to(`conversation:${message.conversationId}`)
      .emit('message:deleted', {
        messageId,
        conversationId: message.conversationId,
      });

    return { success: true, message: 'Message deleted' };
  }
}