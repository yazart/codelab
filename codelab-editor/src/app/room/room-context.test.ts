import {afterEach, describe, expect, it, vi} from 'vitest';
import {RoomApi} from './room-context';

const settings = {apiBase: '/api/v1', webSocketUrl: '/sync'};

afterEach(() => vi.unstubAllGlobals());

describe('RoomApi', () => {
  it('uses the room id as the host user id for a new room', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify('room-a'), {status: 201}));
    vi.stubGlobal('fetch', fetchMock);

    const context = await new RoomApi(settings).resolve('room-a', 'Анна');

    expect(context).toMatchObject({roomId: 'room-a', userId: 'room-a', isHost: true, name: 'Анна'});
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('joins an existing room after a conflict response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('Conflict', {status: 409}))
      .mockResolvedValueOnce(new Response(JSON.stringify('user-b'), {status: 201}));
    vi.stubGlobal('fetch', fetchMock);

    const context = await new RoomApi(settings).resolve('room-a', 'Борис');

    expect(context).toMatchObject({roomId: 'room-a', userId: 'user-b', isHost: false, name: 'Борис'});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
