import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service.js';
import { ConversationsController } from './conversations.controller.js';
import { EventsModule } from '../events/events.module.js'; // <-- ADDED

@Module({
  imports: [EventsModule], // <-- ADDED
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}