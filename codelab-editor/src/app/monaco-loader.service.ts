type MonacoRequire = {
  (dependencies: string[], onLoad: () => void, onError: (error: unknown) => void): void;
  config(options: {paths: {vs: string}}): void;
};

type MonacoWindow = Window & {
  monaco?: typeof monaco;
  require?: MonacoRequire;
};

export class MonacoLoader {
  private loading?: Promise<void>;

  load(): Promise<void> {
    const browserWindow = window as unknown as MonacoWindow;
    if (browserWindow.monaco?.editor) {
      return Promise.resolve();
    }

    if (!this.loading) {
      this.loading = new Promise<void>((resolve, reject) => {
        const loadEditor = () => {
          const amdRequire = browserWindow.require;
          if (!amdRequire) {
            reject(new Error('Monaco AMD loader is unavailable'));
            return;
          }

          amdRequire.config({paths: {vs: '/assets/monaco/min/vs'}});
          amdRequire(['vs/editor/editor.main'], resolve, reject);
        };

        const existingLoader = document.querySelector<HTMLScriptElement>('script[data-monaco-loader]');
        if (existingLoader) {
          existingLoader.addEventListener('load', loadEditor, {once: true});
          existingLoader.addEventListener('error', reject, {once: true});
          return;
        }

        const loader = document.createElement('script');
        loader.src = '/assets/monaco/min/vs/loader.js';
        loader.async = true;
        loader.dataset['monacoLoader'] = 'true';
        loader.addEventListener('load', loadEditor, {once: true});
        loader.addEventListener('error', reject, {once: true});
        document.head.appendChild(loader);
      });
    }

    return this.loading;
  }
}
