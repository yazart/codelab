import { Routes } from '@angular/router';
import {AppStartComponent} from "./start/start.component";

export const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'start'},
  {path: 'start', loadComponent: ()=> import('./start/start.component').then(c=> c.AppStartComponent)},
  // {path: 'login'},
  {path: 'room/:roomId', loadComponent: ()=> import('./room/room.component').then(c=>c.AppRoomComponent)}
];
