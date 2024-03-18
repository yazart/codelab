import {Injectable} from '@angular/core';
import {v4} from "uuid";

@Injectable()
export class RoomContextService {
  roomId: string = v4();
  isHost: boolean = false;
  userId: string = v4();
  name: string = '';

  baseValue = `
  // simple code for check work
  function a() {console.log('hello codelab!');}
  a();
  `
  get connectionId(): string {
    return this.isHost ? this.roomId : this.userId
  }
}
