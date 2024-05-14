import {ResolveFn} from "@angular/router";
import {inject} from "@angular/core";
import {RoomApiService} from "./room-api.service";
import {v4} from "uuid";
import {catchError, combineLatest, forkJoin, map, of, switchMap} from "rxjs";
import {HttpErrorResponse, HttpStatusCode} from "@angular/common/http";

export const contextResolver: ResolveFn<{}> = (route, state) => {
  const roomApi = inject(RoomApiService);
  const roomId = route.paramMap.get('roomId') || v4();
  return combineLatest([roomApi.createById(roomId), of(true)]).pipe(
    catchError((error)=> {
      if(error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict){
        return combineLatest([of(roomId), of(false)]);
      }
      return combineLatest([roomApi.create(), of(false)]);
    }),
    switchMap(([id, isHost])=>{
      if(!isHost){
        return forkJoin({
          isHost: of(isHost),
          roomId: of(id),
          userId: roomApi.join(id)
        })
      }
      return forkJoin({
        isHost: of(isHost),
        roomId: of(id),
        userId: of(id)
      })
    })
  )
};
