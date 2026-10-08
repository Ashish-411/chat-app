import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service.js';
import { PushSubscriptionDto } from './dto/push-subscription.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  subscribe(
    @CurrentUser() user: { userId: string },
    @Body() dto: PushSubscriptionDto,
  ) {
    return this.notificationsService.subscribe(user.userId, dto);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.notificationsService.unsubscribe(body.endpoint);
  }
}