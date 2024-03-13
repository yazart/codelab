import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TuiIslandModule} from "@taiga-ui/kit";
import {TuiButtonModule} from "@taiga-ui/core";
import { v4 } from "uuid";
import {Router} from "@angular/router";

@Component({
  selector: 'app-start',
  standalone: true,
  templateUrl: './start.component.html',
  imports: [
    TuiIslandModule,
    TuiButtonModule
  ],
  styleUrls: ['./start.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStartComponent {

  constructor(private readonly router: Router) {
  }
  createRoom(): Promise<unknown> {
    const roomId = v4();
    const navigation = this.router.createUrlTree(['room', roomId]);
    return this.router.navigateByUrl(navigation);
  }
}
