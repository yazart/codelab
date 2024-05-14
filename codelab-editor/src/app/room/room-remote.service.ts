import {Inject, Injectable} from '@angular/core';
import {Operation, OPERATIONS_IN, OPERATIONS_OUT, OperationType} from "../common/operations";
import {BehaviorSubject, filter, tap} from "rxjs";
import {RoomContextService} from "./room-context.service";
import {RemoteCursorManager} from "../remote-lib/RemoteCursorManager";
import {RemoteSelectionManager} from "../remote-lib/RemoteSelectionManager";
import {EditorContentManager} from "../remote-lib/EditorContentManager";
import {HASH_GEN, HashGen} from "../hash-gen.token";

@Injectable()
export class RoomRemoteService{
  cursor: RemoteCursorManager | undefined;
  selection: RemoteSelectionManager | undefined;
  editor: EditorContentManager | undefined;
  originalEditor: monaco.editor.ICodeEditor | undefined;

  constructor(
    @Inject(OPERATIONS_OUT) private readonly opOutStream: BehaviorSubject<Operation| null>,
    @Inject(OPERATIONS_IN) private readonly opInStream: BehaviorSubject<Operation| null>,
    @Inject(HASH_GEN) private readonly hashGen: HashGen,
    private readonly context: RoomContextService
  ) {
  }
  init(editor: monaco.editor.ICodeEditor): void {
    this.originalEditor = editor;
    editor.onDidChangeCursorPosition((e)=>{
      const lastEvent = this.opInStream.value;
      if(lastEvent?.type === OperationType.InsertText || lastEvent?.type === OperationType.State){
        return;
      }
      this.opOutStream.next({type: OperationType.MoveCursor, data: {userId: this.context.userId, position:e.position}})
    })
    editor.onDidChangeCursorSelection((e)=>{
      const start = e.selection.getStartPosition();
      const end = e.selection.getEndPosition();
      const lastEvent = this.opInStream.value;
      if(lastEvent?.type === OperationType.InsertText || lastEvent?.type === OperationType.State){
        return;
      }
      if(start.lineNumber === end.lineNumber && start.column === end.column){
        return;
      }

      this.opOutStream.next({type: OperationType.SelectText, data: {userId: this.context.userId, start: start, end: end}})
    })

    this.cursor = new RemoteCursorManager({
      editor: editor as any,
      tooltips: true,
      tooltipDuration: 3
    });

    this.selection = new RemoteSelectionManager({
      editor: editor as any
    });

    this.editor = new EditorContentManager({
      editor: editor as any,
      onInsert: (index: number, text: string) => this.onInsert(index,text) ,
      onReplace: (index: number, length: number, text: string) => this.onReplace(index, length, text),
      onDelete: (index: number, length: number) => this.onDelete(index, length),
    });
    this.opInStream
      .pipe(
        tap((r)=> console.log( 'in stream', r)),
        filter((x): x is Operation=>!!x),
        filter((x)=> {
          const {userId} = Object.assign({userId: undefined}, x.data);
          return userId === undefined || userId !== this.context.userId;
        })
      )
      .subscribe((operation)=>{
        this.executeOperation(operation);
      })
  }
  private async executeOperation(operation: Operation): Promise<void>{
    if(operation.type === OperationType.InsertText) {
      this.editor?.insert(operation.data.index, operation.data.text || '');
    }
    if(operation.type === OperationType.ReplaceText) {
      this.editor?.replace(operation.data.index, operation.data.length || 0, operation.data.text || '');
    }

    if(operation.type === OperationType.DeleteText) {
      this.editor?.delete(operation.data.index, operation.data.length || 0);
    }

    if(operation.type === OperationType.MoveCursor) {
      this.cursor?.setCursorPosition(operation.data.userId, operation.data.position);
      this.cursor?.showCursor(operation.data.userId)
    }
    if(operation.type === OperationType.SelectText) {
      this.selection?.setSelectionPositions(operation.data.userId, operation.data.start, operation.data.end);
      this.selection?.showSelection(operation.data.userId)
    }

    if(operation.type === OperationType.GetState) {
      const text = this.originalEditor?.getValue() || '';
      const hash = await this.hashGen(text);
      this.opOutStream.next({
        type: OperationType.State,
        data: {
          userId: this.context.userId,
          value: text,
          hash,
        }
      })
    }

    if(operation.type === OperationType.State) {
      const original = this.originalEditor?.getValue() || '';
      const originalHash = await this.hashGen(original);

      if(operation.data.hash === originalHash){
        return ;
      }

      this.originalEditor?.setValue(operation.data.value ||this.originalEditor?.getValue() || '');
    }
  }

  private onInsert(index: number, text: string){
    console.log('onInsert');
    const ds = this.opInStream.value
    if(ds?.type === OperationType.State) {
      if(ds.data.value === text){
        return;
      }
    }

    if(ds?.type === OperationType.InsertText){
      if (ds.data.text === text && ds.data.index === index){
        return;
      }
    }
    this.opOutStream.next({type: OperationType.InsertText, data: { userId: this.context.userId, index: index, text: text}});
  }
  private onDelete(index: number, length: number){
    const ds = this.opInStream.value
    if(ds?.type === OperationType.DeleteText){
      if (ds.data.length === length && ds.data.index === index){
        return;
      }
    }
    this.opOutStream.next({type: OperationType.DeleteText, data: { userId: this.context.userId, index: index, length: length}})
  }
  private onReplace(index: number,length: number, text: string){
    const ds = this.opInStream.value
    if(ds?.type === OperationType.ReplaceText){
      if (ds.data.text === text && ds.data.index === index && ds.data.length ===length){
        return;
      }
    }
    this.opOutStream.next({type: OperationType.ReplaceText, data: { userId: this.context.userId, index: index, text: text, length: length}});
  }
}
