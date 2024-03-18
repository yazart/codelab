import {InjectionToken} from "@angular/core";

export type AppSettings = {
  peerServer: {
    host: string,
    port?: number,
    secure?: boolean,
    path: string
  }
}

export const APP_SETTINGS = new InjectionToken<AppSettings>('settings for application');
