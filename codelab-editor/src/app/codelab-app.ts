import './components/name-dialog';
import {loadAppSettings, type AppSettings} from './common/app-settings';
import type {NameDialog} from './components/name-dialog';
import './components/start-page';
import './components/room-page';
import type {RoomPage} from './components/room-page';
import {RoomApi} from './room/room-context';

export class CodelabApp extends HTMLElement {
  private settings?: AppSettings;
  private rendering = 0;

  async connectedCallback(): Promise<void> {
    this.settings = await loadAppSettings();
    window.addEventListener('popstate', this.onPopState);
    this.addEventListener('click', this.onRouteClick);
    this.addEventListener('create-room', this.onCreateRoom);
    await this.renderRoute();
  }

  disconnectedCallback(): void {
    window.removeEventListener('popstate', this.onPopState);
    this.removeEventListener('click', this.onRouteClick);
    this.removeEventListener('create-room', this.onCreateRoom);
  }

  private readonly onPopState = (): void => { void this.renderRoute(); };

  private readonly onCreateRoom = (): void => {
    this.navigate(`/room/${crypto.randomUUID()}`);
  };

  private readonly onRouteClick = (event: Event): void => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-route]');
    if (!link || event.defaultPrevented) return;
    event.preventDefault();
    this.navigate(link.pathname);
  };

  private navigate(path: string): void {
    history.pushState(null, '', path);
    void this.renderRoute();
  }

  private async renderRoute(): Promise<void> {
    const request = ++this.rendering;
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      history.replaceState(null, '', '/start');
      segments.push('start');
    }

    if (segments[0] === 'start' && segments.length === 1) {
      this.replaceChildren(document.createElement('codelab-start'));
      return;
    }

    if (segments[0] === 'room' && segments.length <= 2) {
      const roomId = segments[1] || crypto.randomUUID();
      if (!segments[1]) history.replaceState(null, '', `/room/${roomId}`);
      await this.openRoom(roomId, request);
      return;
    }

    this.innerHTML = `
      <main class="not-found">
        <p class="eyebrow">404</p>
        <h1>Такой страницы нет</h1>
        <p>Вернитесь на стартовую страницу и создайте новую комнату.</p>
        <a href="/start" data-route><void-button>На главную</void-button></a>
      </main>`;
  }

  private async openRoom(roomId: string, request: number): Promise<void> {
    if (!this.settings) return;
    const dialog = document.createElement('codelab-name-dialog') as NameDialog;
    this.append(dialog);
    const name = await dialog.request();
    if (request !== this.rendering) return;
    if (!name) {
      this.navigate('/start');
      return;
    }

    this.innerHTML = '<main class="room-loading"><div class="loader"></div><p>Подключаем комнату…</p></main>';
    try {
      const context = await new RoomApi(this.settings).resolve(roomId, name);
      if (request !== this.rendering) return;
      const room = document.createElement('codelab-room') as RoomPage;
      room.configure(context, this.settings);
      this.replaceChildren(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      this.innerHTML = `
        <main class="not-found">
          <p class="eyebrow">Ошибка подключения</p>
          <h1>Комната недоступна</h1>
          <p>${escapeHtml(message)}</p>
          <a href="/start" data-route><void-button>Вернуться</void-button></a>
        </main>`;
    }
  }
}

function escapeHtml(value: string): string {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}
