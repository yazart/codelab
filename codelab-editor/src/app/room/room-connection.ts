import type {AppSettings} from '../common/app-settings';
import {Operation, OperationType} from '../common/operations';
import type {User} from './user';
import type {RoomContext} from './room-context';
import type {RoomRemote} from './room-remote';

type ServerMessage =
  | {event: 'operation'; from: string; data: Operation}
  | {event: 'users'; data: string[]};

export class RoomConnection {
  private readonly users = new Map<string, User>();
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private closed = false;
  private remote?: RoomRemote;

  constructor(
    private readonly context: RoomContext,
    private readonly settings: AppSettings,
    private readonly onUsers: (users: User[]) => void,
    private readonly onOperation: (operation: Operation) => void,
  ) {
    this.users.set(context.userId, {
      id: context.userId,
      name: context.name,
      color: context.color,
    });
    this.publishUsers();
  }

  attachRemote(remote: RoomRemote): void {
    this.remote = remote;
    for (const user of this.users.values()) this.addDecorations(user);
  }

  open(): void {
    this.closed = false;
    this.connect();
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close(1000, 'Page closed');
    for (const user of this.users.values()) {
      user.cursor?.dispose();
      user.selection?.dispose();
    }
  }

  send(operation: Operation): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(operation));
    }
  }

  private connect(): void {
    this.socket = new WebSocket(this.webSocketUrl());
    this.socket.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.sendIdentity();
      this.send({type: OperationType.GetState, data: {userId: this.context.userId}});
    });
    this.socket.addEventListener('message', ({data}) => this.receive(String(data)));
    this.socket.addEventListener('close', () => {
      if (!this.closed) this.scheduleReconnect();
    });
    this.socket.addEventListener('error', () => this.socket?.close());
  }

  private webSocketUrl(): string {
    const url = new URL(this.settings.webSocketUrl || '/sync', window.location.href);
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

  private receive(raw: string): void {
    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      console.warn('Получено некорректное WebSocket-сообщение');
      return;
    }
    if (!isServerMessage(message)) return;

    if (message.event === 'users') {
      this.removeOfflineUsers(message.data);
      return;
    }

    const operation = message.data;
    if (operation.type === OperationType.Whoami) {
      const isNew = !this.users.has(operation.data.id);
      this.updateUser(operation.data);
      if (isNew) this.sendIdentity();
    }
    if (operation.type === OperationType.UserList) {
      operation.data.forEach(user => this.updateUser(user));
    }
    this.onOperation(operation);
    void this.remote?.receive(operation);
  }

  private sendIdentity(): void {
    this.send({
      type: OperationType.Whoami,
      data: {
        id: this.context.userId,
        userId: this.context.userId,
        name: this.context.name,
        color: this.context.color,
      },
    });
  }

  private updateUser(client: Pick<User, 'id' | 'name' | 'color'>): void {
    const existing = this.users.get(client.id);
    if (existing) {
      existing.name = client.name || existing.name;
      this.addDecorations(existing);
    } else {
      const user: User = {...client};
      this.users.set(client.id, user);
      this.addDecorations(user);
    }
    this.publishUsers();
  }

  private addDecorations(user: User): void {
    if (user.id === this.context.userId) return;
    user.cursor ??= this.remote?.cursor?.addCursor(user.id, user.color, user.name);
    user.selection ??= this.remote?.selection?.addSelection(user.id, user.color, user.name);
  }

  private removeOfflineUsers(onlineIds: string[]): void {
    const online = new Set(onlineIds);
    for (const [id, user] of this.users) {
      if (id === this.context.userId || online.has(id)) continue;
      user.cursor?.dispose();
      user.selection?.dispose();
      this.users.delete(id);
    }
    this.publishUsers();
  }

  private publishUsers(): void {
    this.onUsers([...this.users.values()]);
  }
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as {event?: unknown; from?: unknown; data?: unknown};
  if (message.event === 'users') {
    return Array.isArray(message.data) && message.data.every(id => typeof id === 'string');
  }
  return message.event === 'operation'
    && typeof message.from === 'string'
    && !!message.data
    && typeof message.data === 'object'
    && typeof (message.data as {type?: unknown}).type === 'string';
}
