import {Inject, Injectable} from '@angular/core';
import {DataConnection, Peer} from "peerjs";
import {RoomContextService} from "./room-context.service";
import {BehaviorSubject} from "rxjs";
import {User} from "./user";
import {RoomRemoteService} from "./room-remote.service";
import {Operation, OPERATIONS_IN, OperationType} from "../common/operations";

@Injectable()
export class RoomConnectionService {
  onPeerDisconnected: ((peerId: string) => void) = ()=>{};
  onOpen: (id: string) => void = ()=>{
    this.connectToTarget(this.context.roomId);
  }
  private network: Set<DataConnection> = new Set<DataConnection>();
  private users = new Map<string, User>([[this.context.connectionId, {id: this.context.connectionId, name: this.context.name}]])
  private peer: Peer | undefined;
  users$ =new BehaviorSubject([...this.users.values()])
  constructor(
    private readonly context: RoomContextService,
    private readonly remote: RoomRemoteService,
    @Inject(OPERATIONS_IN) private readonly opStream: BehaviorSubject<Operation | null>
  ) {
    this.peer = new Peer(this.context.connectionId, {
      host: "localhost",
      port: 3300,
      path: "/v1/peer",
    });
    this._onOpen();
  }

  private _onOpen() {
    this.peer?.on('open', (id) => {
      console.info('Peer ID: ' + id);
      this.onPeerConnection();
      this.onOpen(id);
    });
  }

  /**
   *  Connect to a target, and requests for the initial data;
   *
   * @param {string} targetPeerId
   * @memberof Broadcast
   */
  connectToTarget(targetPeerId: string, loadInitialData = true) {
    // console.log(`connecting to ${targetPeerId} ...`);
    const conn = this.peer?.connect(targetPeerId);
    conn?.on('open', () => {
      console.log(`==> connected to ${targetPeerId}`);
      this.addToNetwork(conn, false);
      if (loadInitialData) {
        conn.send({ type: 'load' });
      }
      this.onData(conn);
      this.onConnClose(conn);
    });
  }

  private onPeerConnection() {
    this.peer?.on('connection', (conn) => {
      console.log(`<== receive connection from ${conn.peer}`);
      this.addToNetwork(conn, true);
      conn.on('open', () => {
        this.onData(conn);
        this.onConnClose(conn);
      });
    });
  }

  broadcast(op: {type: string, data: any}) {
    this.network
      .forEach(c => {
        console.log('send', c.peer, 'from', this.peer?.id);
        if(c.peer !== this.peer?.id){
          if(op.data.userId){
            if(op.data.userId!== c.peer){
              c.send(op);
            }
          }else {
            c.send(op);
          }
        }
      });
  }

  private addToNetwork(conn: DataConnection, broadcast: boolean) {
    if (!!conn) {
      this.network.add(conn);
      this.broadcast({
        type: 'whoami',
        data: {
          id: this.context.connectionId,
          name: this.context.name,
        }
      });
      if (broadcast) {
        console.log(`broadcasting ADD_TO_NETWORK:[${conn.peer}]`)
        this.broadcast({
          type: 'add-to-network',
          data: conn.peer,
        });

      }
      this.logInfo();
    }
  }

  private removeConnection(conn: DataConnection) {
    if (this.network.has(conn)) {
      this.network.delete(conn);
    }
    this.logInfo();
  }

  private onData(conn: DataConnection) {
    // Receive messages
    conn.on('data', (d: unknown) => {
      // console.log(`Received from ${conn.peer}`, JSON.stringify(d, null, 4));
      const {type, data} = d as {type: string, data: User};

      if(type ==='whoami'){
        console.log('here',d);

        this.updateUserList(data);
        this.broadcast({
          type: 'userList',
          data: [...this.users.values()]
        });
      }
      if(type === 'userList'){
        console.log('userList')
        const users = [...data as unknown as User[]];
        users.forEach((e)=> this.updateUserList(e));
      }

      if(type === OperationType.InsertText){
        console.log('from Broadcast', d);
        this.opStream.next({type: OperationType.InsertText, data: {...data} as unknown as any})
      }
      if(type === OperationType.ReplaceText){
        console.log('from Broadcast', d);
        this.opStream.next({type: OperationType.ReplaceText, data: {...data} as unknown as any})
      }
      if(type === OperationType.DeleteText){
        console.log('from Broadcast', d);
        this.opStream.next({type: OperationType.DeleteText, data: {...data} as unknown as any})
      }

      if(type === OperationType.SelectText){
        console.log('from Broadcast', d);
        //this.opStream.next({type: OperationType.SelectText, data: {...data} as unknown as any})
      }
      if(type === OperationType.MoveCursor){
        console.log('from Broadcast', d);
        //this.opStream.next({type: OperationType.MoveCursor, data: {...data} as unknown as any})
      }


    });
  }

  private onConnClose(conn: DataConnection) {
    conn.on('close', () => {
      this.removeConnection(conn);
      this.onPeerDisconnected && this.onPeerDisconnected(conn.peer);
    });
  }

  private logInfo() {
    console.log(`network:[${[...this.network.values()].map(a => a.peer)}]`);
  }
  private updateUserList(data: User) {
    if(this.users.has(data.id)){
      const user = this.users.get(data.id);
      if(user && !user.cursor){
        user.cursor = this.remote.cursor?.addCursor(user.id, 'red', user.name);
      }
      if(user && !user.selection){
        user.selection = this.remote.selection?.addSelection(user.id, 'red', user.name);
      }
    }else{
      const cursor = this.remote.cursor?.addCursor(data.id, 'red', data.name);
      const selection  = this.remote.selection?.addSelection(data.id, 'red', data.name);
      this.users.set(data.id, {...data, cursor, selection});
    }
    this.users$.next([...this.users.values()])
  }
}
