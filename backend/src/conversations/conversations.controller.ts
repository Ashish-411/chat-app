import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConversationsService } from './conversations.service.js';
import { CreateDmDto } from './dto/create-dm.dto.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateConversationDto } from './dto/update-conversation.dto.js';
import { AddParticipantsDto } from './dto/add-participants.dto.js';
import { UpdateParticipantRoleDto } from './dto/update-participant-role.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('conversations')
@UseGuards(AuthGuard('jwt'))
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('dm')
  createDm(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateDmDto,
  ) {
    return this.conversationsService.createDm(user.userId, dto);
  }

  @Post('group')
  createGroup(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateGroupDto,
  ) {
    return this.conversationsService.createGroup(user.userId, dto);
  }

  @Get()
  getMyConversations(@CurrentUser() user: { userId: string }) {
    return this.conversationsService.listForUser(user.userId);
  }

  @Get(':id')
  getConversation(
    @CurrentUser() user: { userId: string },
    @Param('id') conversationId: string,
  ) {
    return this.conversationsService.getConversationForUser(conversationId, user.userId);
  }

  // ---------- NEW GROUP MANAGEMENT ENDPOINTS ----------

  @Patch(':id')
  updateGroup(
    @CurrentUser() user: { userId: string },
    @Param('id') conversationId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.updateGroup(user.userId, conversationId, dto);
  }

  @Post(':id/participants')
  addParticipants(
    @CurrentUser() user: { userId: string },
    @Param('id') conversationId: string,
    @Body() dto: AddParticipantsDto,
  ) {
    return this.conversationsService.addParticipants(user.userId, conversationId, dto);
  }

  @Delete(':id/participants/:userId')
  removeParticipant(
    @CurrentUser() user: { userId: string },
    @Param('id') conversationId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.conversationsService.removeParticipant(user.userId, conversationId, targetUserId);
  }

  @Post(':id/leave')
  leaveGroup(
    @CurrentUser() user: { userId: string },
    @Param('id') conversationId: string,
  ) {
    return this.conversationsService.leaveGroup(user.userId, conversationId);
  }

  @Patch(':id/participants/:userId/role')
  updateParticipantRole(
    @CurrentUser() user: { userId: string },
    @Param('id') conversationId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateParticipantRoleDto,
  ) {
    return this.conversationsService.updateParticipantRole(
      user.userId,
      conversationId,
      targetUserId,
      dto,
    );
  }
}