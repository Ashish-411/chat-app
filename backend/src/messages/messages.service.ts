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
      where: {
        userId,
        conversationId,
      },
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
          senderId: userId,
          conversationId,
        },
        include: {
          sender: {
            select: publicUserSelect,
          },
        },
      });

      await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return createdMessage;
    });

    // Real-time broadcast
    this.events.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', message);

    return message;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    limit: number = 50,
    cursor?: string,
  ) {
    await this.ensureParticipant(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sender: {
          select: publicUserSelect,
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

  async updateMessage(
    userId: string,
    messageId: string,
    dto: UpdateMessageDto,
  ) {
    const message = await this.prisma.message.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const updatedMessage = await this.prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        content: dto.content,
      },
      include: {
        sender: {
          select: publicUserSelect,
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
      where: {
        id: messageId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.message.delete({
      where: {
        id: messageId,
      },
    });

    this.events.server
      .to(`conversation:${message.conversationId}`)
      .emit('message:deleted', {
        messageId,
        conversationId: message.conversationId,
      });

    return {
      success: true,
      message: 'Message deleted',
    };
  }
}