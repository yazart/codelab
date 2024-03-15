import {ChangeDetectionStrategy, Component, DestroyRef, Inject, OnInit, ViewChild} from '@angular/core';
import {AsyncPipe, JsonPipe, NgForOf} from "@angular/common";
import {MonacoEditorModule, NGX_MONACO_EDITOR_CONFIG} from "ngx-monaco-editor-v2";
import {FormsModule} from "@angular/forms";
import * as m from '@convergencelabs/monaco-collab-ext';
import {RemoteSelectionManager} from '@convergencelabs/monaco-collab-ext';
import {EditorComponent} from "ngx-monaco-editor-v2/lib/editor.component";
import {RoomConnectionService} from "./room-connection.service";
import {TuiBadgeModule} from "@taiga-ui/kit";
import {RoomRemoteService} from "./room-remote.service";
import {Operation, OPERATIONS_IN, OPERATIONS_OUT} from "../common/operations";
import {BehaviorSubject, filter, takeUntil} from "rxjs";
import {TuiDestroyService} from "@taiga-ui/cdk";

@Component({
  selector: 'app-room',
  templateUrl: 'room.component.html',
  styleUrl: './room.component.scss',
  standalone: true,
  imports: [
    AsyncPipe,
    MonacoEditorModule,
    FormsModule,
    NgForOf,
    TuiBadgeModule,
    JsonPipe
  ],
  providers: [
    RoomConnectionService,
    RoomRemoteService,
    {provide: NGX_MONACO_EDITOR_CONFIG, useValue: {
        baseUrl: 'assets', // configure base path for monaco editor. Starting with version 8.0.0 it defaults to './assets'. Previous releases default to '/assets'
        defaultOptions: { scrollBeyondLastLine: false }, // pass default options to be used
        requireConfig: { preferScriptTags: true }, // allows to oweride configuration passed to monacos loader
        monacoRequire: (<any>window).monacoRequire
      }},
    {
      provide: OPERATIONS_IN,
      useValue: new BehaviorSubject<Operation | null>(null),
    },
    {
      provide: OPERATIONS_OUT,
      useValue: new BehaviorSubject<Operation | null>(null),
    },
    TuiDestroyService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppRoomComponent {
  @ViewChild('editor') public readonly editor: EditorComponent | undefined;
  editorOptions = {theme: 'vs-dark', language: 'typescript', minimap: {
      enabled: false,
    }, cursorWidth: 20, cursorBlinking: true, };

  users$ = this.room.users$;
  constructor(
    private readonly room: RoomConnectionService,
    private readonly roomRemote: RoomRemoteService,
    private readonly destroyRef$: TuiDestroyService,
    @Inject(OPERATIONS_IN) private readonly opInStream: BehaviorSubject<Operation| null>,
    @Inject(OPERATIONS_OUT) private readonly opOutStream: BehaviorSubject<Operation| null>
  ) {
  }
  initEditor(e: unknown){
    if(this.editor?.['_editor']){
      this.roomRemote.init(this.editor?.['_editor']);
    }

    this.opOutStream.pipe(
      filter((op): op is Operation=> !!op),
      takeUntil(this.destroyRef$)
    )
      .subscribe((op)=>{
        console.log('to broadcast', op);
        this.room.broadcast({type: op.type, data: {...op.data,self: false}})
    })
  }
}
