import {Inject, Injectable, OnDestroy} from '@angular/core';
import {RoomContextService} from './room-context.service';
import {RoomRemoteService} from './room-remote.service';
import {Operation, OPERATIONS_IN, OperationType} from '../common/operations';
import {BehaviorSubject} from 'rxjs';
import {User} from './user';
import {APP_SETTINGS, AppSettings} from '../common/app-settings';

type ServerMessage =
  | {event: 'operation'; from: string; data: Operation}
  | {event: 'users'; data: string[]};

@Injectable()
export class RoomConnectionService implements OnDestroy {
  users = new Map<string, User>([[
    this.context.userId,
    {id: this.context.userId, name: this.context.name, color: this.context.color},
  ]]);
  users$ = new BehaviorSubject<User[]>([...this.users.values()]);

  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private closed = false;

  constructor(
    private readonly context: RoomContextService,
    private readonly remote: RoomRemoteService,
    @Inject(OPERATIONS_IN) private readonly opStream: BehaviorSubject<Operation | null>,
    @Inject(APP_SETTINGS) private readonly appSettings: AppSettings,
  ) {}

  open(): void {
    this.closed = false;
    this.connect();
  }

  ngOnDestroy(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.socket?.close(1000, 'Component destroyed');
  }

  sendAll(operation: Operation): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(operation));
    }
  }

  private connect(): void {
    const url = this.createWebSocketUrl();
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.sendIdentity();
      this.sendAll({
        type: OperationType.GetState,
        data: {userId: this.context.userId},
      });
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      this.receiveMessage(event.data);
    };

    this.socket.onclose = () => {
      if (!this.closed) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private createWebSocketUrl(): string {
    const url = new URL(this.appSettings.webSocketUrl || '/sync', window.location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    }
    url.searchParams.set('roomId', this.context.roomId);
    url.searchParams.set('userId', this.context.userId);
    return url.toString();
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 10_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private receiveMessage(raw: string): void {
    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      console.error('Invalid WebSocket message', raw);
      return;
    }

    if (!this.isServerMessage(message)) {
      console.error('Unknown WebSocket message', message);
      return;
    }

    if (message.event === 'users') {
      this.updateOnlineUsers(message.data);
      return;
    }

    const operation = message.data;
    if (operation.type === OperationType.Whoami) {
      const isNewClient = !this.users.has(operation.data.id);
      this.clientUpdate(operation.data);
      if (isNewClient) {
        this.sendIdentity();
      }
    }
    if (operation.type === OperationType.UserList) {
      operation.data.forEach((user) => this.clientUpdate(user));
    }
    this.opStream.next(operation);
  }

  private isServerMessage(value: unknown): value is ServerMessage {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const message = value as {event?: unknown; data?: unknown; from?: unknown};
    if (message.event === 'users') {
      return Array.isArray(message.data) && message.data.every((id) => typeof id === 'string');
    }
    return message.event === 'operation'
      && typeof message.from === 'string'
      && this.isOperation(message.data);
  }

  private isOperation(data: unknown): data is Operation {
    const operation = data as Operation;
    return !!data
      && typeof data === 'object'
      && Object.values(OperationType).includes(operation.type);
  }

  private updateOnlineUsers(onlineUserIds: string[]): void {
    const onlineUsers = new Set(onlineUserIds);
    for (const userId of this.users.keys()) {
      if (userId !== this.context.userId && !onlineUsers.has(userId)) {
        this.removeClient(userId);
      }
    }
  }

  private removeClient(id: string): void {
    const user = this.users.get(id);
    user?.cursor?.dispose();
    user?.selection?.dispose();
    this.users.delete(id);
    this.users$.next([...this.users.values()]);
  }

  private sendIdentity(): void {
    this.sendAll({
      type: OperationType.Whoami,
      data: {
        id: this.context.userId,
        userId: this.context.userId,
        name: this.context.name,
        color: this.context.color,
      },
    });
  }

  private clientUpdate(client: Pick<User, 'id' | 'name' | 'color'>): void {
    const existing = this.users.get(client.id);
    if (existing) {
      existing.name = existing.name || client.name;
      if (!existing.cursor) {
        existing.cursor = this.remote.cursor?.addCursor(client.id, existing.color, client.name);
      }
      if (!existing.selection) {
        existing.selection = this.remote.selection?.addSelection(client.id, existing.color, client.name);
      }
    } else {
      this.users.set(client.id, {
        ...client,
        cursor: this.remote.cursor?.addCursor(client.id, client.color, client.name),
        selection: this.remote.selection?.addSelection(client.id, client.color, client.name),
      });
    }
    this.users$.next([...this.users.values()]);
  }
}
