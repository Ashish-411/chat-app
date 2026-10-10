import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UpdateMessageDto } from './dto/update-message.dto.js';
import { AddReactionDto } from './dto/add-reaction.dto.js';
import { SearchMessagesDto } from './dto/search-messages.dto.js';
import { EventsGateway } from '../events/events.gateway.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ChatbotService } from '../chatbot/chatbot.service.js';


const publicUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

const reactionInclude = {
  reactions: {
    select: {
      id: true,
      emoji: true,
      userId: true,
      user: {
        select: publicUserSelect,
      },
    },
  },
};

const replyInclude = {
  replyTo: {
    select: {
      id: true,
      content: true,
      type: true,
      sender: {
        select: publicUserSelect,
      },
    },
  },
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly notifications: NotificationsService,
    private readonly chatbot: ChatbotService,
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

    // If this is a reply, verify the original message exists in this conversation
    if (dto.replyToId) {
      const originalMessage = await this.prisma.message.findFirst({
        where: {
          id: dto.replyToId,
          conversationId,
        },
      });

      if (!originalMessage) {
        throw new NotFoundException('The message you are replying to was not found');
      }
    }

    const message = await this.prisma.$transaction(async tx => {
      const createdMessage = await tx.message.create({
        data: {
          content: dto.content,
          type: dto.type ?? 'TEXT',
          senderId: userId,
          conversationId,
          replyToId: dto.replyToId,
        },
        include: {
          sender: { select: publicUserSelect },
          ...reactionInclude,
          ...replyInclude,
        },
      });

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

    // Send push notifications to all other participants
    const otherParticipants = await this.prisma.participant.findMany({
      where: {
        conversationId,
        userId: { not: userId },
      },
      select: { userId: true },
    });

    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    for (const participant of otherParticipants) {
      await this.notifications.sendNotificationToUser(participant.userId, {
        title: sender?.name || 'New Message',
        body: dto.content,
        conversationId,
        type: 'NEW_MESSAGE',
      });
    }
         // --- TRIGGER CHATBOT ---
     const botId = process.env.BOT_USER_ID;
     if (botId) {
       // Check if this is a DM conversation with the bot
       const conversation = await this.prisma.conversation.findUnique({
         where: { id: conversationId },
         include: { participants: true },
       });

       if (
         conversation?.type === 'DM' &&
         conversation.participants.length === 2 &&
         conversation.participants.some(p => p.userId === botId) &&
         userId !== botId // Prevent bot from replying to itself
       ) {
         // Trigger bot asynchronously so it doesn't block the HTTP response
         this.chatbot.handleBotReply(conversationId, dto.content).catch(err => 
           console.error('Bot error:', err)
         );
       }
     }

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
        ...reactionInclude,
        ...replyInclude,
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

  // --- SEARCH MESSAGES ---

  async searchMessages(
    userId: string,
    conversationId: string,
    dto: SearchMessagesDto,
    limit: number = 50,
  ) {
    await this.ensureParticipant(userId, conversationId);

    if (!dto.q || dto.q.trim().length === 0) {
      return { data: [], nextCursor: undefined };
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        content: {
          contains: dto.q,
          mode: 'insensitive',
        },
      },
      take: limit + 1,
      cursor: dto.cursor ? { id: dto.cursor } : undefined,
      skip: dto.cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: publicUserSelect },
        ...reactionInclude,
        ...replyInclude,
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

  // --- REACTIONS ---

  async addReaction(userId: string, messageId: string, dto: AddReactionDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureParticipant(userId, message.conversationId);

    // Check if reaction already exists
    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: dto.emoji,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('You already reacted with this emoji');
    }

    const reaction = await this.prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji: dto.emoji,
      },
      include: {
        user: { select: publicUserSelect },
      },
    });

    // Broadcast the reaction
    this.events.server
      .to(`conversation:${message.conversationId}`)
      .emit('message:reaction-added', {
        messageId,
        conversationId: message.conversationId,
        reaction: {
          id: reaction.id,
          emoji: reaction.emoji,
          userId: reaction.userId,
          user: reaction.user,
        },
      });

    return reaction;
  }

  async removeReaction(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureParticipant(userId, message.conversationId);

    const reaction = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.messageReaction.delete({
      where: { id: reaction.id },
    });

    // Broadcast the reaction removal
    this.events.server
      .to(`conversation:${message.conversationId}`)
      .emit('message:reaction-removed', {
        messageId,
        conversationId: message.conversationId,
        userId,
        emoji,
      });

    return { success: true, message: 'Reaction removed' };
  }

  // --- DELIVERY & READ STATUS (existing methods) ---

  async markAsDelivered(userId: string, messageId: string) {
    const receipt = await this.prisma.messageReceipt.findUnique({
      where: {
        messageId_userId: { messageId, userId },
      },
    });

    if (!receipt || receipt.status === 'READ') {
      return;
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

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, senderId: true },
    });

    if (message) {
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

    const updatedReceipts = await this.prisma.messageReceipt.updateMany({
      where: {
        userId,
        status: { not: 'READ' as any },
        message: {
          conversationId,
          senderId: { not: userId },
        },
      },
      data: {
        status: 'READ' as any,
        readAt: new Date(),
      },
    });

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

  // --- EDIT & DELETE ---

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
        ...reactionInclude,
        ...replyInclude,
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