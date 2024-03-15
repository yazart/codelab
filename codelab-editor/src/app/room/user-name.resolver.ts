import { of } from 'rxjs';
import {inject, Inject} from '@angular/core';
import { ResolveFn } from '@angular/router';
import {TuiDialogService} from "@taiga-ui/core";
import {AppNameRequestComponent} from "./name-request-dialog.component";
import {PolymorpheusComponent} from "@tinkoff/ng-polymorpheus";

export const userNameResolver: ResolveFn<string> = (route, state) => {
  const dialogs = inject(TuiDialogService)
  return dialogs.open<string>(
    new PolymorpheusComponent(AppNameRequestComponent),
    {
      dismissible: false,
      closeable: false,
    },
  );
};
