# Codelab Editor

Нативное TypeScript-приложение для совместного редактирования кода. Интерфейс построен на Web Components из `@void-web-dev/kit`, сборка выполняется Vite, синхронизация — через WebSocket.

```bash
npm install
npm start
```

Production-сборка:

```bash
npm run build
npm run preview
```

Runtime-настройки находятся в `src/assets/config.json`. В production GitHub Actions заменяет их значениями `CODELAB_API_BASE` и `CODELAB_WEBSOCKET_URL`.
