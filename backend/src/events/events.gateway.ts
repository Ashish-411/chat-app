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
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;

      if (!token) {
        client.emit('connection:error', {
          message: 'Authentication token missing',
        });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);

      if (!payload?.sub) {
        client.emit('connection:error', {
          message: 'Invalid token payload',
        });
        client.disconnect(true);
        return;
      }

      client.data.userId = payload.sub;

      // Each logged-in user joins their personal room.
      // Later this is useful for presence, notifications, etc.
      await client.join(`user:${payload.sub}`);

      client.emit('connection:success', {
        userId: payload.sub,
        socketId: client.id,
      });
    } catch {
      client.emit('connection:error', {
        message: 'Invalid or expired token',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // Later we will use this for presence:
    // user offline, typing cleanup, etc.
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string },
  ) {
    const userId = client.data.userId as string | undefined;

    if (!userId) {
      return {
        ok: false,
        error: 'Unauthorized',
      };
    }

    if (!data?.conversationId) {
      return {
        ok: false,
        error: 'conversationId is required',
      };
    }

    const participant = await this.prisma.participant.findFirst({
      where: {
        userId,
        conversationId: data.conversationId,
      },
    });

    if (!participant) {
      return {
        ok: false,
        error: 'You are not a participant of this conversation',
      };
    }

    await client.join(`conversation:${data.conversationId}`);

    return {
      ok: true,
      conversationId: data.conversationId,
    };
  }

  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string },
  ) {
    if (!data?.conversationId) {
      return {
        ok: false,
        error: 'conversationId is required',
      };
    }

    await client.leave(`conversation:${data.conversationId}`);

    return {
      ok: true,
      conversationId: data.conversationId,
    };
  }
}