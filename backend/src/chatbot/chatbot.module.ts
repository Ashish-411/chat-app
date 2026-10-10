import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [EventsModule],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}