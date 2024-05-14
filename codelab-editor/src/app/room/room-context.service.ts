import {Injectable} from '@angular/core';
import {getUserColor} from "./color-palete";
import {BehaviorSubject} from "rxjs";
import {ActivatedRoute} from "@angular/router";

@Injectable()
export class RoomContextService {
  ready = new BehaviorSubject(false);
  get roomId(): string {
    return this.activatedRouter.snapshot.data['context'].roomId;
  }
  get isHost(): boolean {
    return this.activatedRouter.snapshot.data['context'].isHost;
  }
  get userId(): string {
    return this.activatedRouter.snapshot.data['context'].userId;
  }
  get name(): string {
   return this.activatedRouter.snapshot.data['name'];
  }
  color = getUserColor();
  baseValue = ``;
  constructor(private activatedRouter: ActivatedRoute) {
  }
}
