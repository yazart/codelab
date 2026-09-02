import type {AppSettings} from '../common/app-settings';
import {getUserColor} from './color-palete';

export type RoomContext = {
  roomId: string;
  userId: string;
  isHost: boolean;
  name: string;
  color: ReturnType<typeof getUserColor>;
};

export class RoomApi {
  constructor(private readonly settings: AppSettings) {}

  async resolve(roomId: string, name: string): Promise<RoomContext> {
    const create = await fetch(`${this.settings.apiBase}/rooms/${encodeURIComponent(roomId)}`, {
      method: 'POST',
    });

    if (create.ok) {
      return {roomId, userId: roomId, isHost: true, name, color: getUserColor()};
    }

    if (create.status !== 409) {
      throw new Error(`Не удалось создать комнату (${create.status})`);
    }

    const join = await fetch(`${this.settings.apiBase}/rooms/${encodeURIComponent(roomId)}/users`, {
      method: 'POST',
    });
    if (!join.ok) throw new Error(`Не удалось войти в комнату (${join.status})`);

    return {
      roomId,
      userId: await join.json() as string,
      isHost: false,
      name,
      color: getUserColor(),
    };
  }
}
