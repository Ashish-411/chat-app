import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [EventsModule], 
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}