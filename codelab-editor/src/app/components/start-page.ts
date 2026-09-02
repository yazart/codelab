export class StartPage extends HTMLElement {
  connectedCallback(): void {
    this.className = 'start-page';
    this.innerHTML = `
      <div class="start-glow" aria-hidden="true"></div>
      <void-card class="hero-card">
        <div slot="header">
          <div class="brand-mark" aria-hidden="true">&lt;/&gt;</div>
          <p class="eyebrow">Codelab · Live TypeScript</p>
          <h1>Пишите код вместе.<br><span>В реальном времени.</span></h1>
        </div>
        <p class="hero-copy">Создайте комнату, поделитесь ссылкой и работайте в одном редакторе — без установки и регистрации.</p>
        <div slot="footer" class="hero-actions">
          <void-button id="create-room" size="lg">Создать комнату <span slot="suffix">→</span></void-button>
          <span>Новая ссылка создаётся мгновенно</span>
        </div>
      </void-card>`;
    this.querySelector('#create-room')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('create-room', {bubbles: true, composed: true}));
    });
  }
}

customElements.define('codelab-start', StartPage);
