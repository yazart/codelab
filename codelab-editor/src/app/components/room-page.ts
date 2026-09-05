import type {AppSettings} from '../common/app-settings';
import {OperationType} from '../common/operations';
import {MonacoLoader} from '../monaco-loader.service';
import {RoomConnection} from '../room/room-connection';
import type {RoomContext} from '../room/room-context';
import {RoomRemote} from '../room/room-remote';
import type {User} from '../room/user';
import {preventPageSave} from '../common/prevent-page-save';

export class RoomPage extends HTMLElement {
  private context?: RoomContext;
  private settings?: AppSettings;
  private connection?: RoomConnection;
  private remote?: RoomRemote;
  private layoutMedia?: MediaQueryList;
  private consoleWindow: Window | null = null;

  configure(context: RoomContext, settings: AppSettings): void {
    this.context = context;
    this.settings = settings;
  }

  connectedCallback(): void {
    if (!this.context || !this.settings) return;
    window.addEventListener('keydown', preventPageSave, true);
    const roomUrl = `${window.location.origin}/room/${encodeURIComponent(this.context.roomId)}`;
    this.className = 'room-page';
    this.innerHTML = `
      <header class="room-header">
        <a class="room-brand" href="/start" data-route><span>&lt;/&gt;</span> Codelab</a>
        <div class="room-meta">
          <span class="live-dot" aria-hidden="true"></span>
          <strong>LIVE</strong>
          <span class="room-id">${escapeHtml(this.context.roomId.slice(0, 8))}</span>
        </div>
      </header>
      <main class="workspace">
        <void-resizable class="room-split" aria-label="Размеры редактора и панели результата">
          <void-resizable-panel class="editor-split" default-size="65" min-size="35" max-size="80">
            <section class="editor-pane" aria-label="Редактор TypeScript">
              <div class="pane-title"><span>main.ts</span><span class="editor-status">Загрузка редактора…</span></div>
              <div class="editor-host"></div>
            </section>
          </void-resizable-panel>
          <void-resizable-handle with-handle aria-label="Изменить ширину редактора и результата"></void-resizable-handle>
          <void-resizable-panel class="side-split" default-size="35" min-size="20" max-size="65">
            <aside class="side-pane">
              <section class="panel share-panel">
                <div class="section-heading"><span>Комната</span><small>${this.context.isHost ? 'Организатор' : 'Участник'}</small></div>
                <div class="copy-row">
                  <input readonly value="${escapeHtml(roomUrl)}" aria-label="Ссылка на комнату">
                  <void-button id="copy-link" size="sm" variant="outline">Копировать</void-button>
                </div>
              </section>
              <section class="panel users-panel">
                <div class="section-heading"><span>Участники</span><small class="user-count">1 онлайн</small></div>
                <div class="users-list"></div>
              </section>
              <section class="panel console-panel">
                <div class="section-heading"><span>Результат</span><small>Browser sandbox</small></div>
                <div class="run-actions">
                  <void-button id="run-code" variant="success">Запустить <span slot="suffix">▶</span></void-button>
                  <void-button id="clear-code" variant="outline">Очистить</void-button>
                </div>
                <iframe src="/assets/run.html" title="Результат выполнения кода" sandbox="allow-scripts allow-same-origin"></iframe>
              </section>
            </aside>
          </void-resizable-panel>
        </void-resizable>
      </main>`;

    // Keyboard events in an iframe do not bubble into the parent window.
    this.querySelector('iframe')?.addEventListener('load', () => {
      this.consoleWindow?.removeEventListener('keydown', preventPageSave, true);
      this.consoleWindow = this.querySelector('iframe')?.contentWindow ?? null;
      this.consoleWindow?.addEventListener('keydown', preventPageSave, true);
    });
    this.querySelector('#copy-link')?.addEventListener('click', () => void this.copyRoomUrl(roomUrl));
    this.querySelector('#run-code')?.addEventListener('click', () => this.runCode(true));
    this.querySelector('#clear-code')?.addEventListener('click', () => this.clearConsole(true));
    this.layoutMedia = window.matchMedia('(max-width: 900px)');
    this.layoutMedia.addEventListener('change', this.syncSplitDirection);
    this.syncSplitDirection();
    void this.startEditor();
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', preventPageSave, true);
    this.consoleWindow?.removeEventListener('keydown', preventPageSave, true);
    this.consoleWindow = null;
    this.connection?.close();
    this.remote?.dispose();
    this.layoutMedia?.removeEventListener('change', this.syncSplitDirection);
  }

  private async startEditor(): Promise<void> {
    if (!this.context || !this.settings) return;
    const status = this.querySelector('.editor-status');
    try {
      await new MonacoLoader().load();
      const host = this.querySelector<HTMLElement>('.editor-host');
      if (!host || !this.isConnected) return;
      monaco.editor.defineTheme('codelab-electric', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          {token: 'keyword', foreground: '55B4FF'},
          {token: 'type.identifier', foreground: '80C7FF'},
          {token: 'string', foreground: 'A8D8FF'},
          {token: 'number', foreground: '62AFFF'},
        ],
        colors: {
          'editor.background': '#07101E',
          'editor.foreground': '#EAF5FF',
          'editorCursor.foreground': '#42AAFF',
          'editor.lineHighlightBackground': '#0B1A2D',
          'editor.selectionBackground': '#145A967A',
          'editor.inactiveSelectionBackground': '#173F6670',
          'editorLineNumber.foreground': '#456A91',
          'editorLineNumber.activeForeground': '#80C7FF',
          'editorIndentGuide.background1': '#173454',
          'editorIndentGuide.activeBackground1': '#28517E',
        },
      });
      const editor = monaco.editor.create(host, {
        theme: 'codelab-electric',
        value: '',
        language: 'typescript',
        automaticLayout: true,
        trimAutoWhitespace: false,
        autoClosingDelete: 'never',
        foldingStrategy: 'indentation',
        contextmenu: false,
        minimap: {enabled: false},
        fontSize: 14,
        fontLigatures: true,
        padding: {top: 18},
      });
      this.connection = new RoomConnection(
        this.context,
        this.settings,
        users => this.renderUsers(users),
        operation => {
          if (operation.type === OperationType.Run) this.runCode(false);
          if (operation.type === OperationType.Clear) this.clearConsole(false);
        },
      );
      this.remote = new RoomRemote(this.context, operation => this.connection?.send(operation));
      this.remote.init(editor);
      this.connection.attachRemote(this.remote);
      this.connection.open();
      if (status) status.textContent = 'TypeScript · синхронизация включена';
    } catch (error) {
      if (status) status.textContent = 'Не удалось загрузить редактор';
      console.error(error);
    }
  }

  private readonly syncSplitDirection = (): void => {
    const split = this.querySelector<HTMLElement & {setSizes(sizes: number[]): void}>('.room-split');
    if (!split || !this.layoutMedia) return;
    split.setAttribute('direction', this.layoutMedia.matches ? 'vertical' : 'horizontal');
    split.setSizes(this.layoutMedia.matches ? [50, 50] : [65, 35]);
  };

  private renderUsers(users: User[]): void {
    const list = this.querySelector('.users-list');
    const count = this.querySelector('.user-count');
    if (!list || !count || !this.context) return;
    list.replaceChildren(...users.map(user => {
      const row = document.createElement('div');
      row.className = 'user-row';
      const dot = document.createElement('span');
      dot.className = 'user-color';
      dot.style.background = user.color;
      const name = document.createElement('span');
      name.textContent = user.name;
      const badge = document.createElement('void-badge');
      badge.setAttribute('variant', 'outline');
      badge.textContent = user.id === this.context?.userId ? 'Вы' : 'Онлайн';
      row.append(dot, name, badge);
      return row;
    }));
    count.textContent = `${users.length} ${users.length === 1 ? 'онлайн' : 'онлайн'}`;
  }

  private async copyRoomUrl(roomUrl: string): Promise<void> {
    await navigator.clipboard.writeText(roomUrl);
    const button = this.querySelector('#copy-link');
    if (button) button.textContent = 'Скопировано';
    setTimeout(() => { if (button) button.textContent = 'Копировать'; }, 1500);
  }

  private runCode(broadcast: boolean): void {
    const value = monaco.editor.getModels()[0]?.getValue() ?? '';
    this.querySelector<HTMLIFrameElement>('iframe')?.contentWindow?.postMessage(value, window.location.origin);
    if (broadcast && this.context) {
      this.connection?.send({type: OperationType.Run, data: {userId: this.context.userId}});
    }
  }

  private clearConsole(broadcast: boolean): void {
    const frame = this.querySelector<HTMLIFrameElement>('iframe');
    if (frame) frame.src = '/assets/run.html';
    if (broadcast && this.context) {
      this.connection?.send({type: OperationType.Clear, data: {userId: this.context.userId}});
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[character] ?? character));
}

customElements.define('codelab-room', RoomPage);
