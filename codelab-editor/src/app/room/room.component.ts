import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Inject, OnInit, ViewChild} from '@angular/core';
import {AsyncPipe, DOCUMENT, JsonPipe, NgForOf} from "@angular/common";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {RoomConnectionService} from "./room-connection.service";
import {TuiBadgeModule, TuiInputCopyModule} from "@taiga-ui/kit";
import {RoomRemoteService} from "./room-remote.service";
import {Operation, OPERATIONS_IN, OPERATIONS_OUT, OperationType} from "../common/operations";
import {BehaviorSubject, filter, takeUntil} from "rxjs";
import {TuiDestroyService} from "@taiga-ui/cdk";
import {TuiButtonModule, TuiGroupModule} from "@taiga-ui/core";
import {RoomContextService} from "./room-context.service";
import {editor} from "monaco-editor";
import EditorAutoClosingEditStrategy = editor.EditorAutoClosingEditStrategy;

@Component({
  selector: 'app-room',
  templateUrl: 'room.component.html',
  styleUrl: './room.component.scss',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    NgForOf,
    TuiBadgeModule,
    JsonPipe,
    TuiButtonModule,
    TuiGroupModule,
    TuiInputCopyModule,
    ReactiveFormsModule
  ],
  providers: [
    RoomContextService,
    RoomConnectionService,
    RoomRemoteService,
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
export class RoomComponent implements AfterViewInit, OnInit{
  @ViewChild('editor') public readonly editor: ElementRef | undefined;
  @ViewChild('frame') public readonly frame: ElementRef | undefined;
  get roomUrl(): string { return `${this.document.baseURI}room/${this.context.roomId}`.replace(/\/\//ig, '/').replace(/(http(s?)):\/(\S)/ig, '$1://$3');}

  roomId = new FormControl('');
  editorM: monaco.editor.ICodeEditor | undefined;

  editorOptions = {
    theme: 'vs-dark',
    value: this.context.isHost ? this.context.baseValue : '',
    language: 'typescript',
    suggest:{
      showFunctions: this.context.isHost,
    },
    trimAutoWhitespace: false,
    autoClosingDelete: 'never' as EditorAutoClosingEditStrategy,
    foldingStrategy: 'indentation' as ('auto' | 'indentation'),
    contextmenu: false,
    minimap: {
      enabled: false,
    }
  };

  users$ = this.room.users$;
  constructor(
    private readonly room: RoomConnectionService,
    private readonly roomRemote: RoomRemoteService,
    public readonly context: RoomContextService,
    private readonly destroyRef$: TuiDestroyService,
    @Inject(OPERATIONS_IN) private readonly opInStream: BehaviorSubject<Operation| null>,
    @Inject(OPERATIONS_OUT) private readonly opOutStream: BehaviorSubject<Operation| null>,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
  }
  ngOnInit(): void {
    this.room.open();
    this.roomId.patchValue(this.roomUrl)
  }

  ngAfterViewInit(): void {

    this.editorM = monaco.editor.create(this.editor?.nativeElement, this.editorOptions);
    this.initEditor();
    }

  initEditor(){
    if(this.editorM){
      this.roomRemote.init(this.editorM);
    }

    this.opInStream.pipe(
      filter((op): op is Operation=> !!op),
      filter(op=> op.type === OperationType.Run || op.type === OperationType.Clear),
      takeUntil(this.destroyRef$)
    ).subscribe((op)=>{

      if(OperationType.Run == op.type && op.data.userId !== this.context.userId){
        this.runCode(false);
      }
      if(OperationType.Clear === op.type && op.data.userId !== this.context.userId){
        this.reload(false);
      }
    })


    this.opOutStream.pipe(
      filter((op): op is Operation=> !!op),
      takeUntil(this.destroyRef$)
    )
      .subscribe((op)=>{
        console.log('to broadcast', op);
        this.room.sendAll(op)
    })
  }
  runCode(withEmit= true){
    const data = this.editorM?.getValue();
    console.log(data);
    this.frame?.nativeElement.contentWindow.postMessage(data, window.location.origin);
    if(withEmit){
      this.opOutStream.next({type: OperationType.Run, data: {userId: this.context.userId}})
    }
  }
  reload(withEmit= true) {
    if(this.frame?.nativeElement){
      this.frame.nativeElement.src = 'assets/run.html';
    }
    if(withEmit){
      this.opOutStream.next({type: OperationType.Clear, data: {userId: this.context.userId}})
    }
  }
}
