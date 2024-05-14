import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import {APP_SETTINGS, AppSettings} from "./app/common/app-settings";


fetch('assets/config.json')
  .then((response)=> response.json())
  .catch(()=>{
    return {
      "peerServer": {
        "host": "localhost",
        "port": 3300,
        "path": "/async",
        "secure": false,
      },
      "apiBase": "/api/v1"
    }
  })
  .then(
    (settings: AppSettings)=>{
      appConfig.providers.push({
        provide: APP_SETTINGS,
        useValue: settings,
      });

      return bootstrapApplication(AppComponent, appConfig)
    }
  )
  .catch((e)=> console.error(e))

