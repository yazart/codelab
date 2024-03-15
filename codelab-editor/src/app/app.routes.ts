import { Routes } from '@angular/router';
import {AppStartComponent} from "./start/start.component";
import {RoomHostComponent} from "./room/room-host.component";
import {userNameResolver} from "./room/user-name.resolver";

export const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'start'},
  {path: 'start', loadComponent: ()=> import('./start/start.component').then(c=> c.AppStartComponent)},
  // {path: 'login'},
  {path: 'room', resolve: {name:userNameResolver}, loadChildren: ()=> import('./room/room.routes').then(r=>r.RoomRoutes)}
];
