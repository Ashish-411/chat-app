import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDmDto } from './dto/create-dm.dto.js';
import { CreateGroupDto } from './dto/create-group.dto.js';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
} as const;

const conversationInclude = {
  participants: {
    include: {
      user: {
        select: publicUserSelect,
      },
    },
  },
  messages: {
    orderBy: {
      createdAt: 'desc' as const,
    },
    take: 1,
    include: {
      sender: {
        select: publicUserSelect,
      },
    },
  },
};

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: conversationInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getConversationForUser(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: conversationInclude,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      participant => participant.userId === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    return conversation;
  }

  async createDm(currentUserId: string, dto: CreateDmDto) {
    if (dto.userId === currentUserId) {
      throw new BadRequestException('You cannot create a DM with yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: {
        id: dto.userId,
      },
      select: {
        id: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        type: 'DM' as any,
        AND: [
          {
            participants: {
              some: {
                userId: currentUserId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: dto.userId,
              },
            },
          },
        ],
      },
      include: {
        participants: true,
      },
    });

    if (existingConversation && existingConversation.participants.length === 2) {
      return this.getConversationForUser(existingConversation.id, currentUserId);
    }

    return this.prisma.$transaction(async tx => {
      const conversation = await tx.conversation.create({
        data: {
          type: 'DM' as any,
          participants: {
            create: [
              {
                userId: currentUserId,
                role: 'MEMBER' as any,
              },
              {
                userId: dto.userId,
                role: 'MEMBER' as any,
              },
            ],
          },
        },
        include: conversationInclude,
      });

      return conversation;
    });
  }

  async createGroup(currentUserId: string, dto: CreateGroupDto) {
    const memberIds = [...new Set(dto.memberIds ?? [])].filter(
      memberId => memberId !== currentUserId,
    );

    if (memberIds.length === 0) {
      throw new BadRequestException(
        'Group must include at least one other member',
      );
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: memberIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (users.length !== memberIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    return this.prisma.$transaction(async tx => {
      const conversation = await tx.conversation.create({
        data: {
          type: 'GROUP' as any,
          name: dto.name.trim(),
          participants: {
            create: [
              {
                userId: currentUserId,
                role: 'ADMIN' as any,
              },
              ...memberIds.map(memberId => ({
                userId: memberId,
                role: 'MEMBER' as any,
              })),
            ],
          },
        },
        include: conversationInclude,
      });

      return conversation;
    });
  }
}