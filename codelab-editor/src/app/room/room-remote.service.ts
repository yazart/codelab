import {Inject, Injectable} from '@angular/core';
import {EditorContentManager, RemoteCursorManager, RemoteSelectionManager} from "@convergencelabs/monaco-collab-ext";
import * as monaco from "monaco-editor";
import {Operation, OPERATIONS_IN, OPERATIONS_OUT, OperationType} from "../common/operations";
import {BehaviorSubject, filter, tap} from "rxjs";
import {RoomContextService} from "./room-context.service";

@Injectable()
export class RoomRemoteService{
  cursor: RemoteCursorManager | undefined;
  selection: RemoteSelectionManager | undefined;
  editor: EditorContentManager | undefined;

  constructor(
    @Inject(OPERATIONS_OUT) private readonly opOutStream: BehaviorSubject<Operation| null>,
    @Inject(OPERATIONS_IN) private readonly opInStream: BehaviorSubject<Operation| null>,
  private readonly context: RoomContextService) {
  }
  init(editor: monaco.editor.ICodeEditor): void {
    editor.onDidChangeCursorPosition((e)=>{
      this.opOutStream.next({type: OperationType.MoveCursor, data: {userId: this.context.connectionId, position:e.position}})
    })
    editor.onDidChangeCursorSelection((e)=>{
      this.opOutStream.next({type: OperationType.SelectText, data: {userId: this.context.connectionId, start: e.selection.getStartPosition(), end: e.selection.getEndPosition()}})
    })

    this.cursor = new RemoteCursorManager({
      editor: editor,
      tooltips: true,
      tooltipDuration: 3
    });

    this.selection = new RemoteSelectionManager({
      editor: editor
    });

    this.editor = new EditorContentManager({
      editor: editor,
      onInsert: (index: number, text: string) => this.onInsert(index,text) ,
      onReplace: (index: number, length: number, text: string) => this.onReplace(index, length, text),
      onDelete: (index: number, length: number) => this.onDelete(index, length),
    });
    this.opInStream
      .pipe(
        tap((r)=> console.log(r)),
        filter((x): x is Operation=>!!x),
      )
      .subscribe((operation)=>{
        this.executeOperation(operation);
      })
  }
  private executeOperation(operation: Operation): void{
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


    if(this.context.isHost){
      this.opOutStream.next(operation);
    }
  }

  private onInsert(index: number, text: string){
    console.log('onInsert');
    const ds = this.opInStream.value
    if(ds?.type === OperationType.InsertText){
      if (ds.data.text === text && ds.data.index === index){
        return;
      }
    }
    this.opOutStream.next({type: OperationType.InsertText, data: { userId: this.context.connectionId, index: index, text: text}});
  }
  private onDelete(index: number, length: number){
    const ds = this.opInStream.value
    if(ds?.type === OperationType.DeleteText){
      if (ds.data.length === length && ds.data.index === index){
        return;
      }
    }
    this.opOutStream.next({type: OperationType.DeleteText, data: { userId: this.context.connectionId, index: index, length: length}})
  }
  private onReplace(index: number,length: number, text: string){
    const ds = this.opInStream.value
    if(ds?.type === OperationType.ReplaceText){
      if (ds.data.text === text && ds.data.index === index && ds.data.length ===length){
        return;
      }
    }
    this.opOutStream.next({type: OperationType.ReplaceText, data: { userId: this.context.connectionId, index: index, text: text, length: length}});
  }
}
