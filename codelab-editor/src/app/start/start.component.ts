import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TuiInputModule, TuiIslandModule} from "@taiga-ui/kit";
import {TuiButtonModule} from "@taiga-ui/core";
import {Router} from "@angular/router";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {AsyncPipe} from "@angular/common";

@Component({
  selector: 'app-start',
  standalone: true,
  templateUrl: './start.component.html',
  imports: [
    TuiIslandModule,
    TuiButtonModule,
    TuiInputModule,
    FormsModule,
    ReactiveFormsModule,
    AsyncPipe
  ],
  styleUrls: ['./start.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppStartComponent {

  constructor(private readonly router: Router) {
  }
  createRoom(): Promise<unknown> {
    const navigation = this.router.createUrlTree(['room', 'create']);
    return this.router.navigateByUrl(navigation);
  }
}
