import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {RoomContextService} from "./room-context.service";
import {ActivatedRoute, Router, RouterOutlet} from "@angular/router";
import {v4} from "uuid";

@Component({
  selector: 'app-room-host',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RoomContextService],
})
export class RoomHostComponent implements OnInit {
  constructor(
    private readonly activatedRouter: ActivatedRoute,
    private readonly roomContext: RoomContextService,
    private readonly router: Router) {
  }

  ngOnInit() {
    this.roomContext.isHost  = this.activatedRouter.snapshot.paramMap.get('roomId') === 'create';
    this.roomContext.name = this.activatedRouter.snapshot.data['name'] || '$unknown';
    if(!this.roomContext.isHost) {
      this.roomContext.roomId = this.activatedRouter.snapshot.paramMap.get('roomId') || v4();
    }
    this.router.navigate(['../', this.roomContext.roomId], {relativeTo: this.activatedRouter}).then()
  }
}
