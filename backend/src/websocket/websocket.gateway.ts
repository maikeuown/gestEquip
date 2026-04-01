import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('WebsocketGateway');
  private userSockets = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService, private config: ConfigService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token, { secret: this.config.get('jwt.secret') });
      client.data.userId = payload.sub;
      client.data.institutionId = payload.institutionId;
      client.join(`user:${payload.sub}`);
      client.join(`institution:${payload.institutionId}`);
      if (!this.userSockets.has(payload.sub)) this.userSockets.set(payload.sub, new Set());
      this.userSockets.get(payload.sub)!.add(client.id);
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      const sockets = this.userSockets.get(client.data.userId);
      if (sockets) { sockets.delete(client.id); if (!sockets.size) this.userSockets.delete(client.data.userId); }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-ticket')
  joinTicket(@ConnectedSocket() client: Socket, @MessageBody() ticketId: string) {
    client.join(`ticket:${ticketId}`);
  }

  @SubscribeMessage('leave-ticket')
  leaveTicket(@ConnectedSocket() client: Socket, @MessageBody() ticketId: string) {
    client.leave(`ticket:${ticketId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { room: string; isTyping: boolean }) {
    client.to(data.room).emit('user-typing', { userId: client.data.userId, isTyping: data.isTyping });
  }

  @OnEvent('maintenance.created')
  onMaintenanceCreated(ticket: any) {
    this.server.to(`institution:${ticket.institutionId}`).emit('maintenance:created', ticket);
  }

  @OnEvent('maintenance.updated')
  onMaintenanceUpdated(ticket: any) {
    this.server.to(`institution:${ticket.institutionId}`).emit('maintenance:updated', ticket);
  }

  @OnEvent('maintenance.message')
  onMaintenanceMessage({ ticket, message }: any) {
    this.server.to(`ticket:${ticket.id}`).emit('ticket:message', message);
  }

  @OnEvent('movement.created')
  onMovementCreated(movement: any) {
    this.server.to(`institution:${movement.institutionId}`).emit('movement:created', movement);
  }

  @OnEvent('movement.updated')
  onMovementUpdated(movement: any) {
    this.server.to(`institution:${movement.institutionId}`).emit('movement:updated', movement);
  }

  @OnEvent('notification.created')
  onNotification(notification: any) {
    this.server.to(`user:${notification.userId}`).emit('notification', notification);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToInstitution(institutionId: string, event: string, data: any) {
    this.server.to(`institution:${institutionId}`).emit(event, data);
  }
}
