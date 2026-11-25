import { Global, Injectable, Module } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { RealtimeEvent } from '@food-stack/shared';
import { readCookie, SESSION_COOKIE } from '../auth/cookies';
import { SessionService } from '../auth/session.service';

export const roomOf = (restaurantId: string): string => `restaurant:${restaurantId}`;

export interface RealtimePublisher {
  publish(restaurantId: string, event: RealtimeEvent, payload: unknown): void;
}

interface SocketData {
  userId: string;
  token: string;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: (process.env.WEB_ORIGIN ?? 'http://localhost:5173').split(','), credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, RealtimePublisher {
  @WebSocketServer()
  private server!: Server;

  private readonly sockets = new Set<Socket>();

  constructor(private readonly sessions: SessionService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = readCookie(client.handshake.headers.cookie, SESSION_COOKIE);
    const user = await this.sessions.validate(token);
    if (!token || !user) {
      client.disconnect(true);
      return;
    }
    const data: SocketData = { userId: user.id, token };
    client.data = data;
    this.sockets.add(client);
    await client.join(roomOf(user.restaurantId));
  }

  handleDisconnect(client: Socket): void {
    this.sockets.delete(client);
  }

  publish(restaurantId: string, event: RealtimeEvent, payload: unknown): void {
    this.server.to(roomOf(restaurantId)).emit(event, payload);
  }

  /** Derruba todos os sockets de um restaurante (ex.: ao desativá-lo). */
  disconnectRestaurant(restaurantId: string): void {
    this.server.in(roomOf(restaurantId)).disconnectSockets(true);
  }

  disconnectSession(token: string | undefined): void {
    for (const socket of this.sockets) {
      if ((socket.data as SocketData).token === token) socket.disconnect(true);
    }
  }

  disconnectUser(userId: string): void {
    for (const socket of this.sockets) {
      if ((socket.data as SocketData).userId === userId) socket.disconnect(true);
    }
  }
}

@Global()
@Module({ providers: [RealtimeGateway], exports: [RealtimeGateway] })
export class RealtimeModule {}
