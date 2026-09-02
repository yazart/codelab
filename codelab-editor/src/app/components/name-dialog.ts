export class NameDialog extends HTMLElement {
  private resolve?: (name: string | null) => void;

  connectedCallback(): void {
    this.innerHTML = `
      <void-dialog label="Вход в комнату">
        <div slot="header">
          <p class="eyebrow">Совместная сессия</p>
          <h2>Как вас представить?</h2>
        </div>
        <form class="name-form">
          <void-input name="name" label="Ваше имя" placeholder="Например, Алексей" required></void-input>
          <p class="form-hint">Имя увидят только участники этой комнаты.</p>
          <void-button type="submit">Войти в комнату</void-button>
        </form>
      </void-dialog>`;

    const dialog = this.querySelector('void-dialog') as HTMLElement & {show(): void};
    const input = this.querySelector('void-input') as HTMLElement & {value: string; focus(): void};
    const savedName = sessionStorage.getItem('codelab-name') ?? '';
    if (savedName) input.setAttribute('value', savedName);

    const form = this.querySelector<HTMLFormElement>('form');
    const submit = (event: Event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) {
        input.setAttribute('error', 'Введите имя');
        input.focus();
        return;
      }
      sessionStorage.setItem('codelab-name', name);
      this.finish(name);
    };
    form?.addEventListener('submit', submit);
    this.querySelector('void-button[type="submit"]')?.addEventListener('click', submit);
    dialog.addEventListener('void-close', () => this.finish(null));
    dialog.show();
    queueMicrotask(() => input.focus());
  }

  request(): Promise<string | null> {
    return new Promise(resolve => { this.resolve = resolve; });
  }

  private finish(name: string | null): void {
    this.resolve?.(name);
    this.resolve = undefined;
    this.remove();
  }
}

customElements.define('codelab-name-dialog', NameDialog);
