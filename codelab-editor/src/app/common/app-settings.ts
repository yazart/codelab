import {InjectionToken} from "@angular/core";

export type AppSettings = {
  webSocketUrl: string,
  "apiBase": string,
}

export const APP_SETTINGS = new InjectionToken<AppSettings>('settings for application');
