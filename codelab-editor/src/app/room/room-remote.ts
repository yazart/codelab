import {EditorContentManager} from '../remote-lib/EditorContentManager';
import {RemoteCursorManager} from '../remote-lib/RemoteCursorManager';
import {RemoteSelectionManager} from '../remote-lib/RemoteSelectionManager';
import {Operation, OperationType} from '../common/operations';
import type {RoomContext} from './room-context';

export class RoomRemote {
  cursor?: RemoteCursorManager;
  selection?: RemoteSelectionManager;
  private content?: EditorContentManager;
  private editor?: monaco.editor.ICodeEditor;
  private incoming?: Operation;

  constructor(
    private readonly context: RoomContext,
    private readonly send: (operation: Operation) => void,
  ) {}

  init(editor: monaco.editor.ICodeEditor): void {
    this.editor = editor;
    this.cursor = new RemoteCursorManager({editor, tooltips: true, tooltipDuration: 3});
    this.selection = new RemoteSelectionManager({editor});
    this.content = new EditorContentManager({
      editor,
      onInsert: (index, text) => this.emitEdit(OperationType.InsertText, index, text),
      onReplace: (index, length, text) => this.emitEdit(OperationType.ReplaceText, index, text, length),
      onDelete: (index, length) => this.emitEdit(OperationType.DeleteText, index, undefined, length),
    });

    editor.onDidChangeCursorPosition(({position}) => {
      if (!this.isApplyingText()) {
        this.send({type: OperationType.MoveCursor, data: {userId: this.context.userId, position}});
      }
    });
    editor.onDidChangeCursorSelection(({selection}) => {
      if (this.isApplyingText() || selection.isEmpty()) return;
      this.send({
        type: OperationType.SelectText,
        data: {
          userId: this.context.userId,
          start: selection.getStartPosition(),
          end: selection.getEndPosition(),
        },
      });
    });
  }

  async receive(operation: Operation): Promise<void> {
    const operationUser = 'userId' in operation.data ? operation.data.userId : undefined;
    if (operationUser === this.context.userId) return;

    this.incoming = operation;
    try {
      if (operation.type === OperationType.InsertText) this.content?.insert(operation.data.index, operation.data.text ?? '');
      if (operation.type === OperationType.ReplaceText) this.content?.replace(operation.data.index, operation.data.length ?? 0, operation.data.text ?? '');
      if (operation.type === OperationType.DeleteText) this.content?.delete(operation.data.index, operation.data.length ?? 0);
      if (operation.type === OperationType.MoveCursor) {
        this.cursor?.setCursorPosition(operation.data.userId, operation.data.position);
        this.cursor?.showCursor(operation.data.userId);
      }
      if (operation.type === OperationType.SelectText) {
        this.selection?.setSelectionPositions(operation.data.userId, operation.data.start, operation.data.end);
        this.selection?.showSelection(operation.data.userId);
      }
      if (operation.type === OperationType.GetState) {
        const value = this.editor?.getValue() ?? '';
        this.send({
          type: OperationType.State,
          data: {userId: this.context.userId, value, hash: await sha256(value)},
        });
      }
      if (operation.type === OperationType.State) {
        const current = this.editor?.getValue() ?? '';
        if (await sha256(current) !== operation.data.hash) this.editor?.setValue(operation.data.value ?? current);
      }
    } catch (error) {
      console.warn('Операция синхронизации пропущена', operation, error);
    } finally {
      this.incoming = undefined;
    }
  }

  dispose(): void {
    this.content?.dispose();
    this.editor?.dispose();
  }

  private emitEdit(type: OperationType.InsertText | OperationType.ReplaceText | OperationType.DeleteText, index: number, text?: string, length?: number): void {
    if (this.isApplyingText()) return;
    this.send({type, data: {userId: this.context.userId, index, text, length}});
  }

  private isApplyingText(): boolean {
    return this.incoming?.type === OperationType.InsertText
      || this.incoming?.type === OperationType.ReplaceText
      || this.incoming?.type === OperationType.DeleteText
      || this.incoming?.type === OperationType.State;
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
