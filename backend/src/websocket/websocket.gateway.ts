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

interface PresenceEntry {
  userId: string;
  name: string;
  role: string;
  socketId: string;
}

// Role pairing rules: who can chat with whom
const ALLOWED_PEERS: Record<string, string[]> = {
  TECHNICIAN: ['TEACHER', 'STAFF'],
  TEACHER: ['TECHNICIAN'],
  STAFF: ['TECHNICIAN'],
};

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('WebsocketGateway');
  private userSockets = new Map<string, Set<string>>();

  // Presence store: socketId -> { userId, name, role, socketId }
  private presence = new Map<string, PresenceEntry>();

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

    // Remove from presence and broadcast to allowed peers
    const entry = this.presence.get(client.id);
    if (entry) {
      this.presence.delete(client.id);
      const peers = this.getAllowedPeers(entry.userId, entry.role);
      for (const peer of peers) {
        this.server.to(`user:${peer.userId}`).emit('presence:left', { userId: entry.userId });
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('presence:join')
  handlePresenceJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; name: string; role: string },
  ) {
    const entry: PresenceEntry = { userId: data.userId, name: data.name, role: data.role, socketId: client.id };
    this.presence.set(client.id, entry);
    this.logger.log(`Presence: ${data.name} (${data.role}) joined`);

    // Send filtered peer list to the joining user
    const peers = this.getFilteredPeers(data.userId, data.role);
    client.emit('presence:list', peers);

    // Broadcast to allowed peers that someone joined
    const broadcastTargets = this.getAllowedPeers(data.userId, data.role);
    for (const peer of broadcastTargets) {
      this.server.to(`user:${peer.userId}`).emit('presence:joined', {
        userId: data.userId,
        name: data.name,
        role: data.role,
      });
    }
  }

  @SubscribeMessage('presence:request')
  handlePresenceRequest(@ConnectedSocket() client: Socket) {
    const entry = this.presence.get(client.id);
    if (!entry) return;
    const peers = this.getFilteredPeers(entry.userId, entry.role);
    client.emit('presence:list', peers);
  }

  @SubscribeMessage('message:send')
  handleMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { toUserId: string; content: string },
  ) {
    const sender = this.presence.get(client.id);
    if (!sender) {
      client.emit('message:error', { message: 'Não estás conectado ao chat.' });
      return;
    }

    // Enforce role pairing
    const allowedRoles = ALLOWED_PEERS[sender.role];
    if (!allowedRoles) {
      client.emit('message:error', { message: 'O teu tipo de utilizador não pode usar o chat.' });
      return;
    }

    // Find the target user's presence entries to get their role
    const targetPresence = [...this.presence.values()].find((p) => p.userId === data.toUserId);
    if (!targetPresence) {
      client.emit('message:error', { message: 'Utilizador não está online.' });
      return;
    }

    if (!allowedRoles.includes(targetPresence.role)) {
      client.emit('message:error', { message: 'Não podes enviar mensagens a este utilizador.' });
      return;
    }

    // Deliver message
    const payload = {
      fromUserId: sender.userId,
      fromName: sender.name,
      content: data.content,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${data.toUserId}`).emit('message:receive', payload);
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

  // --- Helpers ---

  /** Get all online users that the given user is allowed to see/communicate with */
  private getFilteredPeers(userId: string, role: string): PresenceEntry[] {
    const allowedRoles = ALLOWED_PEERS[role];
    if (!allowedRoles) return [];
    const seen = new Set<string>();
    const peers: PresenceEntry[] = [];
    for (const entry of this.presence.values()) {
      if (entry.userId === userId) continue;
      if (seen.has(entry.userId)) continue;
      if (allowedRoles.includes(entry.role)) {
        seen.add(entry.userId);
        peers.push(entry);
      }
    }
    return peers;
  }

  /** Get all online peers for broadcasting (returns PresenceEntry objects) */
  private getAllowedPeers(_userId: string, role: string): PresenceEntry[] {
    const allowedRoles = ALLOWED_PEERS[role];
    if (!allowedRoles) return [];
    const seen = new Set<string>();
    const peers: PresenceEntry[] = [];
    for (const entry of this.presence.values()) {
      if (seen.has(entry.userId)) continue;
      if (allowedRoles.includes(entry.role)) {
        seen.add(entry.userId);
        peers.push(entry);
      }
    }
    return peers;
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
