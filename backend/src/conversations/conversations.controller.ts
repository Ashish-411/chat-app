import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConversationsService } from './conversations.service.js';
import { CreateDmDto } from './dto/create-dm.dto.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
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
    return this.conversationsService.getConversationForUser(
      conversationId,
      user.userId,
    );
  }
}