import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDmDto } from './dto/create-dm.dto.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateConversationDto } from './dto/update-conversation.dto.js';
import { AddParticipantsDto } from './dto/add-participants.dto.js';
import { UpdateParticipantRoleDto } from './dto/update-participant-role.dto.js';
import { EventsGateway } from '../events/events.gateway.js';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway, // <-- ADDED
  ) {}

  // ---------- EXISTING METHODS ----------

  async listForUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: conversationInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversationForUser(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
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
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        type: 'DM' as any,
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: dto.userId } } },
        ],
      },
      include: { participants: true },
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
              { userId: currentUserId, role: 'MEMBER' as any },
              { userId: dto.userId, role: 'MEMBER' as any },
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
      throw new BadRequestException('Group must include at least one other member');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
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
              { userId: currentUserId, role: 'ADMIN' as any },
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

  // ---------- NEW GROUP MANAGEMENT METHODS ----------

  // Helper: Ensure user is an ADMIN of a GROUP conversation
  private async ensureGroupAdmin(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== 'GROUP') {
      throw new BadRequestException('This action is only available for group chats');
    }

    const participant = conversation.participants.find(p => p.userId === userId);

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    if (participant.role !== 'ADMIN') {
      throw new ForbiddenException('You must be a group admin to perform this action');
    }

    return conversation;
  }

  // Update group name
  async updateGroup(userId: string, conversationId: string, dto: UpdateConversationDto) {
    await this.ensureGroupAdmin(userId, conversationId);

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { name: dto.name },
      include: conversationInclude,
    });

    this.events.server
      .to(`conversation:${conversationId}`)
      .emit('group:updated', { conversationId, name: updated.name });

    return updated;
  }

  // Add members to group
  async addParticipants(userId: string, conversationId: string, dto: AddParticipantsDto) {
    await this.ensureGroupAdmin(userId, conversationId);

    const newMemberIds = [...new Set(dto.userIds)].filter(id => id !== userId);

    if (newMemberIds.length === 0) {
      throw new BadRequestException('No new members to add');
    }

    // Verify users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: newMemberIds } },
      select: { id: true },
    });

    if (users.length !== newMemberIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    // Filter out users already in the group
    const existingParticipants = await this.prisma.participant.findMany({
      where: {
        conversationId,
        userId: { in: newMemberIds },
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingParticipants.map(p => p.userId));
    const toAdd = newMemberIds.filter(id => !existingUserIds.has(id));

    if (toAdd.length === 0) {
      throw new BadRequestException('All selected users are already in the group');
    }

    // Add new members
    await this.prisma.participant.createMany({
      data: toAdd.map(memberId => ({
        userId: memberId,
        conversationId,
        role: 'MEMBER' as any,
      })),
    });

    // Fetch added users' info for the event
    const addedUsers = await this.prisma.user.findMany({
      where: { id: { in: toAdd } },
      select: publicUserSelect,
    });

    // Notify everyone in the group
    this.events.server
      .to(`conversation:${conversationId}`)
      .emit('group:member-added', {
        conversationId,
        addedBy: userId,
        members: addedUsers,
      });

    // Notify the newly added users so their conversation list updates
    for (const memberId of toAdd) {
      this.events.server.to(`user:${memberId}`).emit('group:added-to-conversation', {
        conversationId,
      });
    }

    return this.getConversationForUser(conversationId, userId);
  }

  // Remove member from group
  async removeParticipant(userId: string, conversationId: string, targetUserId: string) {
    await this.ensureGroupAdmin(userId, conversationId);

    if (targetUserId === userId) {
      throw new BadRequestException('You cannot remove yourself. Use the leave endpoint instead.');
    }

    const targetParticipant = await this.prisma.participant.findFirst({
      where: { userId: targetUserId, conversationId },
    });

    if (!targetParticipant) {
      throw new NotFoundException('User is not a member of this group');
    }

    await this.prisma.participant.delete({
      where: { id: targetParticipant.id },
    });

    // Notify everyone in the group
    this.events.server
      .to(`conversation:${conversationId}`)
      .emit('group:member-removed', {
        conversationId,
        removedBy: userId,
        removedUserId: targetUserId,
      });

    // Notify the removed user
    this.events.server.to(`user:${targetUserId}`).emit('group:removed-from-conversation', {
      conversationId,
    });

    return { success: true, message: 'Member removed' };
  }

  // Leave group
  async leaveGroup(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== 'GROUP') {
      throw new BadRequestException('You cannot leave a DM conversation');
    }

    const participant = conversation.participants.find(p => p.userId === userId);

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    // Prevent the last admin from leaving
    const admins = conversation.participants.filter(p => p.role === 'ADMIN');
    if (participant.role === 'ADMIN' && admins.length === 1) {
      throw new BadRequestException(
        'You are the only admin. Promote another member to admin before leaving.',
      );
    }

    await this.prisma.participant.delete({
      where: { id: participant.id },
    });

    this.events.server
      .to(`conversation:${conversationId}`)
      .emit('group:member-left', {
        conversationId,
        userId,
      });

    return { success: true, message: 'You left the group' };
  }

  // Promote/demote a member
  async updateParticipantRole(
    userId: string,
    conversationId: string,
    targetUserId: string,
    dto: UpdateParticipantRoleDto,
  ) {
    await this.ensureGroupAdmin(userId, conversationId);

    if (targetUserId === userId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const targetParticipant = await this.prisma.participant.findFirst({
      where: { userId: targetUserId, conversationId },
    });

    if (!targetParticipant) {
      throw new NotFoundException('User is not a member of this group');
    }

    const updated = await this.prisma.participant.update({
      where: { id: targetParticipant.id },
      data: { role: dto.role as any },
    });

    this.events.server
      .to(`conversation:${conversationId}`)
      .emit('group:role-changed', {
        conversationId,
        changedBy: userId,
        targetUserId,
        role: dto.role,
      });

    return updated;
  }
}