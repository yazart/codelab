import {RoomHostComponent} from "./room-host.component";
import {v4} from "uuid";

export const RoomRoutes = [
  { path: ':roomId',
    loadComponent: ()=>import('./room-host.component').then(c=> c.RoomHostComponent),
    children: [
      {
        path: '',
        loadComponent: ()=> import('./room.component').then(c=>c.AppRoomComponent)
      },
      {
        path: '**',
        loadComponent: ()=> import('../common/not-found.component').then(c=>c.NotFoundComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo:'create'
  }
]
