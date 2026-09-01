import {Injectable} from '@nestjs/common';
import {v4} from 'uuid';

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, Set<string>>();

  get roomIds(): string[] {
    return [...this.rooms.keys()];
  }

  get size(): number {
    return this.rooms.size;
  }

  has(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  create(roomId = v4()): string {
    this.rooms.set(roomId, new Set([roomId]));
    return roomId;
  }

  join(roomId: string): string | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    const userId = v4();
    room.add(userId);
    return userId;
  }

  users(roomId: string): string[] {
    return [...(this.rooms.get(roomId) ?? [])];
  }

  hasUser(roomId: string, userId: string): boolean {
    return this.rooms.get(roomId)?.has(userId) ?? false;
  }
}
