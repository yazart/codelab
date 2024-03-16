import {
  AfterContentInit, AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Inject,
  OnInit,
  ViewChild
} from '@angular/core';
import {AsyncPipe, JsonPipe, NgForOf} from "@angular/common";
import {FormsModule} from "@angular/forms";
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
    FormsModule,
    NgForOf,
    TuiBadgeModule,
    JsonPipe
  ],
  providers: [
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
export class AppRoomComponent implements AfterViewInit{
  @ViewChild('editor') public readonly editor: ElementRef | undefined;
  editorM: monaco.editor.ICodeEditor | undefined;

  editorOptions = {
    theme: 'vs-dark',
    language: 'typescript',
    minimap: {
      enabled: false,
    },
    cursorWidth: 5,
  };

  users$ = this.room.users$;
  constructor(
    private readonly room: RoomConnectionService,
    private readonly roomRemote: RoomRemoteService,
    private readonly destroyRef$: TuiDestroyService,
    @Inject(OPERATIONS_IN) private readonly opInStream: BehaviorSubject<Operation| null>,
    @Inject(OPERATIONS_OUT) private readonly opOutStream: BehaviorSubject<Operation| null>
  ) {
  }

  ngAfterViewInit(): void {
    this.editorM = monaco.editor.create(this.editor?.nativeElement, this.editorOptions);
    this.initEditor();
    }

  initEditor(){
    if(this.editorM){
      this.roomRemote.init(this.editorM);
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
