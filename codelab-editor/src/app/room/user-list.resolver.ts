import {ResolveFn} from "@angular/router";
import {inject} from "@angular/core";
import {RoomApiService} from "./room-api.service";
import {of} from "rxjs";

export const userListResolver: ResolveFn<string[]> = (route, state) => {
  const roomApiService = inject(RoomApiService)
  const roomId = route.paramMap.get('roomId');
  if(roomId && roomId !== 'create') {
    return roomApiService.users(roomId);
  }
  return of([])
};
