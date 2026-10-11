import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';
import { EventsModule } from '../events/events.module.js';
import { ChatbotModule } from '../chatbot/chatbot.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js'; // <-- ADD THIS

@Module({
  imports: [
    EventsModule, 
    ChatbotModule, 
    NotificationsModule // <-- ADD THIS
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}