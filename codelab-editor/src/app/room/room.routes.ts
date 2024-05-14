import {userListResolver} from "./user-list.resolver";
import {contextResolver} from "./context.resolver";
import {v4} from "uuid";
import {Routes} from "@angular/router";

export const RoomRoutes:Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: `${v4()}`,
  },
  { path: ':roomId',
    resolve: {
      context: contextResolver,
    },
    loadComponent: ()=>import('./room-host.component').then(c=> c.RoomHostComponent),
    children: [
      {
        path: '',
        loadComponent: ()=> import('./room.component').then(c=>c.RoomComponent)
      },
      {
        path: '**',
        loadComponent: ()=> import('../common/not-found.component').then(c=>c.NotFoundComponent)
      }
    ]
  },
  {
    path: '**',
    loadComponent: ()=> import('../common/not-found.component').then(c=>c.NotFoundComponent)
  }
]
