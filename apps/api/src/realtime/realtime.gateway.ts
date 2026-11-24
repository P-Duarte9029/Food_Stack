import { Global, Injectable, Module } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { RealtimeEvent } from '@food-stack/shared';
import { DEFAULT_RESTAURANT_ID } from '../restaurant/default-restaurant';

export const roomOf = (restaurantId: string): string => `restaurant:${restaurantId}`;

export interface RealtimePublisher {
  publish(restaurantId: string, event: RealtimeEvent, payload: unknown): void;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: (process.env.WEB_ORIGIN ?? 'http://localhost:5173').split(','), credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, RealtimePublisher {
  @WebSocketServer()
  private server!: Server;

  // Sem autenticação por enquanto: todo cliente entra na sala do restaurante padrão.
  handleConnection(client: Socket): void {
    void client.join(roomOf(DEFAULT_RESTAURANT_ID));
  }

  publish(restaurantId: string, event: RealtimeEvent, payload: unknown): void {
    this.server.to(roomOf(restaurantId)).emit(event, payload);
  }
}

@Global()
@Module({ providers: [RealtimeGateway], exports: [RealtimeGateway] })
export class RealtimeModule {}
