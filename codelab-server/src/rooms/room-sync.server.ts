import {Injectable, Logger, OnApplicationShutdown} from '@nestjs/common';
import {Server} from 'http';
import {RawData, WebSocket, WebSocketServer} from 'ws';
import {RoomsService} from './rooms.service';

type Client = {
  roomId: string;
  userId: string;
  socket: WebSocket;
};

@Injectable()
export class RoomSyncServer implements OnApplicationShutdown {
  private readonly logger = new Logger(RoomSyncServer.name);
  private readonly clients = new Set<Client>();
  private server?: WebSocketServer;

  constructor(private readonly rooms: RoomsService) {}

  attach(httpServer: Server): void {
    this.server = new WebSocketServer({
      server: httpServer,
      path: '/sync',
      maxPayload: 1024 * 1024,
    });

    this.server.on('connection', (socket, request) => {
      const url = new URL(request.url ?? '', 'http://localhost');
      const roomId = url.searchParams.get('roomId');
      const userId = url.searchParams.get('userId');

      if (!roomId || !userId || !this.rooms.hasUser(roomId, userId)) {
        socket.close(1008, 'Unknown room or user');
        return;
      }

      const client = {roomId, userId, socket};
      this.clients.add(client);
      this.broadcastUsers(roomId);

      socket.on('message', (message) => this.relayOperation(client, message));
      socket.on('close', () => this.remove(client));
      socket.on('error', (error) => {
        this.logger.warn(`WebSocket error for user ${userId}: ${error.message}`);
        this.remove(client);
      });
    });
  }

  onApplicationShutdown(): void {
    this.server?.close();
  }

  private relayOperation(sender: Client, message: RawData): void {
    let operation: unknown;
    try {
      operation = JSON.parse(message.toString());
    } catch {
      sender.socket.close(1003, 'Invalid JSON');
      return;
    }

    if (!this.isOperation(operation)) {
      sender.socket.close(1003, 'Invalid operation');
      return;
    }

    this.broadcast(sender.roomId, {
      event: 'operation',
      from: sender.userId,
      data: operation,
    }, sender.socket);
  }

  private isOperation(value: unknown): value is {type: string; data: unknown} {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as {type?: unknown; data?: unknown};
    return typeof candidate.type === 'string' && 'data' in candidate;
  }

  private remove(client: Client): void {
    if (!this.clients.delete(client)) {
      return;
    }
    this.broadcastUsers(client.roomId);
  }

  private broadcastUsers(roomId: string): void {
    const users = [...new Set(
      [...this.clients]
        .filter((client) => client.roomId === roomId && client.socket.readyState === WebSocket.OPEN)
        .map((client) => client.userId),
    )];
    this.broadcast(roomId, {event: 'users', data: users});
  }

  private broadcast(roomId: string, payload: unknown, excluded?: WebSocket): void {
    const serialized = JSON.stringify(payload);
    for (const client of this.clients) {
      if (
        client.roomId === roomId
        && client.socket !== excluded
        && client.socket.readyState === WebSocket.OPEN
      ) {
        client.socket.send(serialized);
      }
    }
  }
}
