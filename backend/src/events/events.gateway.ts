import 'dotenv/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service.js';

@WebSocketGateway({
  cors: {
    origin: '*', 
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // Helper to check if a user has any active socket connections
  private isUserOnline(userId: string): boolean {
    const rooms = this.server?.sockets?.adapter?.rooms as Map<string, Set<string>> | undefined;
    const room = rooms?.get(`user:${userId}`);
    return room ? room.size > 0 : false;
  }

  // Broadcasts online/offline status to all conversations the user belongs to
  private async broadcastPresence(userId: string, status: 'online' | 'offline') {
    const participations = await this.prisma.participant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    for (const p of participations) {
      this.server.to(`conversation:${p.conversationId}`).emit('user:presence', {
        userId,
        status,
      });
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.emit('connection:error', { message: 'Authentication token missing' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);

      if (!payload?.sub) {
        client.emit('connection:error', { message: 'Invalid token payload' });
        client.disconnect(true);
        return;
      }

      const userId = payload.sub;
      client.data.userId = userId;

      // Join personal room
      await client.join(`user:${userId}`);

      client.emit('connection:success', { userId, socketId: client.id });

      // Check if this is their FIRST socket (they just came online)
      const rooms = this.server.sockets.adapter.rooms as Map<string, Set<string>> | undefined;
      const userRoom = rooms?.get(`user:${userId}`);
      if (userRoom && userRoom.size === 1) {
        await this.broadcastPresence(userId, 'online');
      }
    } catch {
      client.emit('connection:error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    // Wait 100ms to allow Socket.IO to clean up the room after disconnect
    setTimeout(async () => {
      const rooms = this.server.sockets.adapter.rooms as Map<string, Set<string>> | undefined;
      const userRoom = rooms?.get(`user:${userId}`);
      
      // If room doesn't exist or is empty, they are completely offline
      if (!userRoom || userRoom.size === 0) {
        await this.broadcastPresence(userId, 'offline');
      }
    }, 100);
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string },
  ) {
    const userId = client.data.userId as string | undefined;

    if (!userId || !data?.conversationId) {
      return { ok: false, error: 'Unauthorized or missing conversationId' };
    }

    const participant = await this.prisma.participant.findFirst({
      where: { userId, conversationId: data.conversationId },
    });

    if (!participant) {
      return { ok: false, error: 'You are not a participant of this conversation' };
    }

    await client.join(`conversation:${data.conversationId}`);

    // Fetch all participants to send initial presence state
    const allParticipants = await this.prisma.participant.findMany({
      where: { conversationId: data.conversationId },
      select: { userId: true },
    });

    const presenceMap = allParticipants.map((p) => ({
      userId: p.userId,
      isOnline: this.isUserOnline(p.userId),
    }));

    // Send initial presence to the user who just joined
    client.emit('conversation:presence', presenceMap);

    return { ok: true, conversationId: data.conversationId };
  }

  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string },
  ) {
    if (!data?.conversationId) {
      return { ok: false, error: 'conversationId is required' };
    }
    await client.leave(`conversation:${data.conversationId}`);
    return { ok: true, conversationId: data.conversationId };
  }

  // --- TYPING INDICATORS ---

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.conversationId) return;

    // Broadcast to everyone in the room EXCEPT the sender
    client.broadcast.to(`conversation:${data.conversationId}`).emit('typing:update', {
      userId,
      conversationId: data.conversationId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.conversationId) return;

    client.broadcast.to(`conversation:${data.conversationId}`).emit('typing:update', {
      userId,
      conversationId: data.conversationId,
      isTyping: false,
    });
  }
    // --- DELIVERY & READ STATUS ---

  @SubscribeMessage('message:delivered')
  async handleMessageDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !data?.messageId) return;

    const receipt = await this.prisma.messageReceipt.findUnique({
      where: {
        messageId_userId: { messageId: data.messageId, userId },
      },
    });

    if (!receipt || receipt.status === 'READ') return;

    await this.prisma.messageReceipt.update({
      where: {
        messageId_userId: { messageId: data.messageId, userId },
      },
      data: {
        status: 'DELIVERED' as any,
        deliveredAt: new Date(),
      },
    });

    // Notify the sender
    const message = await this.prisma.message.findUnique({
      where: { id: data.messageId },
      select: { conversationId: true, senderId: true },
    });

    if (message) {
      this.server.to(`user:${message.senderId}`).emit('message:status-update', {
        messageId: data.messageId,
        conversationId: message.conversationId,
        userId,
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });
    }
  }

  @SubscribeMessage('conversation:read')
  async handleConversationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !data?.conversationId) return;

    // Check participant
    const participant = await this.prisma.participant.findFirst({
      where: { userId, conversationId: data.conversationId },
    });

    if (!participant) return;

    // Update all unread receipts
    await this.prisma.messageReceipt.updateMany({
      where: {
        userId,
        status: { not: 'READ' as any },
        message: {
          conversationId: data.conversationId,
          senderId: { not: userId },
        },
      },
      data: {
        status: 'READ' as any,
        readAt: new Date(),
      },
    });

    // Notify all senders in this conversation
    const senders = await this.prisma.message.findMany({
      where: {
        conversationId: data.conversationId,
        senderId: { not: userId },
      },
      select: { senderId: true },
      distinct: ['senderId'],
    });

    for (const sender of senders) {
      this.server.to(`user:${sender.senderId}`).emit('message:status-update', {
        conversationId: data.conversationId,
        userId,
        status: 'READ',
        readAt: new Date(),
      });
    }
  }
}