import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UpdateMessageDto } from './dto/update-message.dto.js';

const publicUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper to check if user is in the conversation
  private async ensureParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { userId, conversationId },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }
    return participant;
  }

  async sendMessage(userId: string, conversationId: string, dto: CreateMessageDto) {
    await this.ensureParticipant(userId, conversationId);

    // We use a transaction to create the message AND update the conversation's updatedAt
    // so the conversation list sorts correctly by latest activity.
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          content: dto.content,
          senderId: userId,
          conversationId,
        },
        include: {
          sender: { select: publicUserSelect },
        },
      });

      // Touch the conversation to update its `updatedAt` timestamp
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return message;
    });
  }

  async getMessages(userId: string, conversationId: string, limit: number = 50, cursor?: string) {
    await this.ensureParticipant(userId, conversationId);

    // Cursor-based pagination (fetches newest messages first)
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: limit + 1, // Take one extra to check if there are more pages
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor itself if provided
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: publicUserSelect },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop(); // Remove the extra item
      nextCursor = nextItem?.id;
    }

    return {
      data: messages,
      nextCursor,
    };
  }

  async updateMessage(userId: string, messageId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('You can only edit your own messages');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content },
      include: { sender: { select: publicUserSelect } },
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('You can only delete your own messages');

    await this.prisma.message.delete({ where: { id: messageId } });
    return { success: true, message: 'Message deleted' };
  }
}