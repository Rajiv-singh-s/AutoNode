import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@autonode/shared';
import type { JwtPayload } from '../auth/auth.types';

/**
 * Realtime fan-out. Clients authenticate with their JWT via the
 * `auth.token` handshake field and are joined to a per-organization room so
 * inbox updates only reach the right tenant.
 */
@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      await client.join(RealtimeGateway.room(payload.orgId));
      this.logger.debug(`Socket ${client.id} joined org ${payload.orgId}`);
    } catch {
      client.disconnect(true);
    }
  }

  private static room(orgId: string): string {
    return `org:${orgId}`;
  }

  emitConversationUpdated(orgId: string, conversation: unknown): void {
    this.server.to(RealtimeGateway.room(orgId)).emit(WS_EVENTS.CONVERSATION_UPDATED, conversation);
  }

  emitMessageCreated(orgId: string, message: unknown): void {
    this.server.to(RealtimeGateway.room(orgId)).emit(WS_EVENTS.MESSAGE_CREATED, message);
  }

  emitAiAnalysisReady(orgId: string, payload: unknown): void {
    this.server.to(RealtimeGateway.room(orgId)).emit(WS_EVENTS.AI_ANALYSIS_READY, payload);
  }
}
