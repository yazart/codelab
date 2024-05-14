import {User} from "../room/user";
import {InjectionToken} from "@angular/core";
import {BehaviorSubject} from "rxjs";

export enum OperationType {
  Run = 'run',
  Clear = 'clear',
  Logout = 'logout',
  Whoami = 'whoami',
  UserList = 'user-list',
  GetState = 'get-state',
  State = 'state',
  SelectText = 'select',
  InsertText = 'insert',
  ReplaceText = 'replace',
  Read = 'read',
  MoveCursor = 'move-cursor',
  DeleteText = 'delete'
}

export type OperationGetState = {
  type: OperationType.GetState
  data: {
    userId: string;
  }
}

export type OperationState = {
  type: OperationType.State
  data: {
    userId: string;
    value: string;
    hash: string;
  }
}

export type OperationRun = {
  type: OperationType.Run
  data: {
    userId: string;
  }
}

export type OperationClear = {
  type: OperationType.Clear
  data: {
    userId: string;
  }
}

export type OperationWhoami = {
  type: OperationType.Whoami,
  data: Pick<User, 'id' | 'name' | 'color'> & { userId: string };
}

export type OperationLogout = {
  type: OperationType.Logout,
  data: {
    userId: string,
  }
}
export type OperationUserList = {
  type: OperationType.UserList,
  data: User[]
}
export type OperationEditor = {
  type: OperationType.InsertText | OperationType.DeleteText | OperationType.ReplaceText
  data: {
    userId: string,
    index: number,
    text?: string,
    length?: number,
  }
}

export type OperationCursor = {
  type: OperationType.MoveCursor,
  data: {
    userId: string,
    position: monaco.Position
  }
}

export type OperationSelection = {
  type: OperationType.SelectText,
  data: {
    userId: string,
    start: monaco.Position,
    end: monaco.Position,
  }
}


export type Operation = OperationRun
  | OperationClear
  | OperationState
  | OperationGetState
  | OperationWhoami
  | OperationEditor
  | OperationUserList
  | OperationLogout
  | OperationCursor
  | OperationSelection;


export const OPERATIONS_IN = new InjectionToken<BehaviorSubject<Operation | null>>('stream operations to broadcast');
export const OPERATIONS_OUT = new InjectionToken<BehaviorSubject<Operation | null>>('stream operations from broadcast');
