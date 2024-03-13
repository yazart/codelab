import {ChangeDetectionStrategy, Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {map} from "rxjs";
import {AsyncPipe} from "@angular/common";
import {MonacoEditorModule, NGX_MONACO_EDITOR_CONFIG} from "ngx-monaco-editor-v2";
import {FormsModule} from "@angular/forms";
import * as m from '@convergencelabs/monaco-collab-ext';
import {RemoteSelectionManager} from '@convergencelabs/monaco-collab-ext';
import {EditorComponent} from "ngx-monaco-editor-v2/lib/editor.component";
import {Peer} from 'peerjs'
import {RoomService} from "./room.service";

@Component({
  selector: 'app-room',
  templateUrl: 'room.component.html',
  styleUrl: './room.component.scss',
  standalone: true,
  imports: [
    AsyncPipe,
    MonacoEditorModule,
    FormsModule
  ],
  providers: [
    RoomService,
    {provide: NGX_MONACO_EDITOR_CONFIG, useValue: {
        baseUrl: 'assets', // configure base path for monaco editor. Starting with version 8.0.0 it defaults to './assets'. Previous releases default to '/assets'
        defaultOptions: { scrollBeyondLastLine: false }, // pass default options to be used
        requireConfig: { preferScriptTags: true }, // allows to oweride configuration passed to monacos loader
        monacoRequire: (<any>window).monacoRequire
      }}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class AppRoomComponent implements OnInit {
  @ViewChild('editor') public readonly editor: EditorComponent | undefined;
  editorOptions = {theme: 'vs-dark', language: 'typescript', minimap: {
      enabled: false,
    }, cursorWidth: 20, cursorBlinking: true, };
  roomId$ = this.activatedRouter.paramMap.pipe(map((e)=> e.get('roomId')))
  constructor(private readonly activatedRouter: ActivatedRoute) {
  }

  ngOnInit() {



    this.roomId$.subscribe((e)=>{

      const peer = new Peer(e as string, {
        host: "localhost",
        port: 3300,
        path: "/v1/peer",
      });
    })
  }

  changeModel(data: string){
    console.log(data);
  }
  initedEditor(e: unknown){

    const f = new m.RemoteCursorManager({
      editor: this.editor?.['_editor'],
      tooltips: true,
      tooltipDuration: 3
    });


    const r = new RemoteSelectionManager({
      editor: this.editor?.['_editor']
    })
    // r.addSelection('p', )
    const p = new m.EditorContentManager({
      editor: this.editor?.['_editor'],
      onInsert: (index: number, text: string) => console.log(index, text),
      onReplace: (index: number, length: number, text: string) => console.log(index,length, text),
      onDelete: (index: number, length: number) => console.log(index, length),
    })



    f.addCursor('p', '#34a0ffa1', 'label');
    f.showCursor('p');
    f.setCursorPosition('p', {lineNumber: 2, column: 3});
    setTimeout(()=>f.setCursorPosition('p', {lineNumber: 3, column: 3}), 1000)
  }
}
