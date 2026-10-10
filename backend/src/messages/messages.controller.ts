import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UpdateMessageDto } from './dto/update-message.dto.js';
import { AddReactionDto } from './dto/add-reaction.dto.js';
import { SearchMessagesDto } from './dto/search-messages.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @CurrentUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.sendMessage(user.userId, conversationId, dto);
  }

  @Get('conversations/:conversationId/messages')
  getMessages(
    @CurrentUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.messagesService.getMessages(
      user.userId,
      conversationId,
      parsedLimit,
      cursor,
    );
  }

  // --- SEARCH MESSAGES ---

  @Get('conversations/:conversationId/messages/search')
  searchMessages(
    @CurrentUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
    @Query('q') q: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.messagesService.searchMessages(user.userId, conversationId, {
      q,
      cursor,
    });
  }

  // --- REACTIONS ---

  @Post('messages/:messageId/reactions')
  addReaction(
    @CurrentUser() user: { userId: string },
    @Param('messageId') messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.messagesService.addReaction(user.userId, messageId, dto);
  }

  @Delete('messages/:messageId/reactions/:emoji')
  removeReaction(
    @CurrentUser() user: { userId: string },
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.messagesService.removeReaction(user.userId, messageId, emoji);
  }

  // --- READ / DELIVERY STATUS ---

  @Post('conversations/:conversationId/read')
  markConversationAsRead(
    @CurrentUser() user: { userId: string },
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.markConversationAsRead(
      user.userId,
      conversationId,
    );
  }

  @Post('messages/:messageId/delivered')
  markAsDelivered(
    @CurrentUser() user: { userId: string },
    @Param('messageId') messageId: string,
  ) {
    return this.messagesService.markAsDelivered(user.userId, messageId);
  }

  @Get('messages/:messageId/receipts')
  getMessageReceipts(
    @CurrentUser() user: { userId: string },
    @Param('messageId') messageId: string,
  ) {
    return this.messagesService.getMessageReceipts(user.userId, messageId);
  }

  // --- EDIT & DELETE ---

  @Patch('messages/:id')
  updateMessage(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.updateMessage(user.userId, id, dto);
  }

  @Delete('messages/:id')
  deleteMessage(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.messagesService.deleteMessage(user.userId, id);
  }
}