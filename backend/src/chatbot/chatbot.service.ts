import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';

@Injectable()
export class ChatbotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async handleBotReply(conversationId: string, userMessage: string) {
    const botId = process.env.BOT_USER_ID;
    if (!botId) return;

    // 1. Simulate "typing" indicator
    this.events.server.to(`conversation:${conversationId}`).emit('typing:update', {
      userId: botId,
      conversationId,
      isTyping: true,
    });

    // Simulate network/thinking delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 2. Generate a response (Rule-based for now)
    const lowerMsg = userMessage.toLowerCase();
    let reply = "I'm just a simple bot right now. Say 'hello', 'help', or 'time'!";

    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      reply = "Hello there! 👋 How can I help you today?";
    } else if (lowerMsg.includes('help')) {
      reply = "I can tell you the time, say hello, or you can connect me to OpenAI later! 🚀";
    } else if (lowerMsg.includes('time')) {
      reply = `The current server time is ${new Date().toLocaleTimeString()}. ⏰`;
    } else if (lowerMsg.includes('who are you')) {
      reply = "I am the official ChatApp Assistant Bot! 🤖";
    }

    // 3. Stop typing
    this.events.server.to(`conversation:${conversationId}`).emit('typing:update', {
      userId: botId,
      conversationId,
      isTyping: false,
    });

    // 4. Save the bot's message to the database
    const botMessage = await this.prisma.message.create({
      data: {
        content: reply,
        senderId: botId,
        conversationId,
        type: 'TEXT',
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // 5. Broadcast the bot's message to the room
    this.events.server.to(`conversation:${conversationId}`).emit('message:new', botMessage);
  }
}