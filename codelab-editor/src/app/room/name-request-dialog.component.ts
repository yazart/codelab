import {Component, Inject, OnInit} from '@angular/core';
import {FormControl, ReactiveFormsModule, Validators} from "@angular/forms";
import {map, startWith} from "rxjs";
import {TuiInputModule} from "@taiga-ui/kit";
import {TuiButtonModule, TuiDialogContext, TuiDialogService} from "@taiga-ui/core";
import {AsyncPipe} from "@angular/common";
import {POLYMORPHEUS_CONTEXT} from "@tinkoff/ng-polymorpheus";

@Component({
  selector: 'app-name-request',
  standalone: true,
  imports: [
    TuiInputModule,
    ReactiveFormsModule,
    TuiButtonModule,
    AsyncPipe
  ],
  template: `
    <tui-input [formControl]="name">
      Ваше имя
      <input

        tuiTextfield
        type="text"
      />
    </tui-input>
    <button
      [disabled]="(invalid$ | async) || false"
      appearance="primary"
      tuiButton
      type="button"
      class="tui-space_right-3 tui-space_bottom-3"
      (click)="submit()"
    >
      Войти
    </button>
  `
})

export class AppNameRequestComponent {
  name= new FormControl<string>('', [Validators.required])

  invalid$ = this.name.statusChanges.pipe(startWith(this.name.status), map(()=> this.name.invalid))

  constructor(@Inject(TuiDialogService) private readonly dialogs: TuiDialogService,@Inject(POLYMORPHEUS_CONTEXT)
  private readonly context: TuiDialogContext<string, string>,) {
  }
  submit() {
    this.context.completeWith(this.name.value || '$unknown');
  }
}
