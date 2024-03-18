import {Component, Inject, OnInit} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {map, startWith} from "rxjs";
import {TuiInputModule} from "@taiga-ui/kit";
import {TuiButtonModule, TuiDialogContext, TuiDialogService, TuiGroupModule} from "@taiga-ui/core";
import {AsyncPipe} from "@angular/common";
import {POLYMORPHEUS_CONTEXT} from "@tinkoff/ng-polymorpheus";
import {TuiAutoFocusModule} from "@taiga-ui/cdk";

@Component({
  selector: 'app-name-request',
  standalone: true,
  imports: [
    TuiInputModule,
    ReactiveFormsModule,
    TuiButtonModule,
    AsyncPipe,
    FormsModule,
    TuiGroupModule,
    TuiAutoFocusModule
  ],
  template: `
    <form [formGroup]="form" action="javascript: void(0);" (ngSubmit)="submit()">
      <div
        tuiGroup
        class="group"
        [collapsed]="true"
      >
          <tui-input [formControlName]="'name'">
            Ваше имя
            <input
              tuiAutoFocus
              tuiTextfield
              type="text"
            />
          </tui-input>

          <button
            [disabled]="(invalid$ | async) || false"
            appearance="primary"
            tuiIconButton
            type="submit"
            icon="tuiIconLogIn"
            class="tui-group__auto-width-item"
            (click)="submit()"
          >
            Войти
          </button>
      </div>
    </form>

  `
})

export class AppNameRequestComponent {
  form = new FormGroup({
    name: new FormControl<string>('', [Validators.required])
  });

  invalid$ = this.form.statusChanges.pipe(startWith(this.form.status), map(()=> this.form.invalid))

  constructor(@Inject(TuiDialogService) private readonly dialogs: TuiDialogService,@Inject(POLYMORPHEUS_CONTEXT)
  private readonly context: TuiDialogContext<string, string>,) {
  }
  submit() {
    this.context.completeWith(this.form.controls.name.value || '$unknown');
  }
}
