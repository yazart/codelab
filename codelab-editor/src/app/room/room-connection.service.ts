import {Inject, Injectable} from '@angular/core';
import {RoomContextService} from "./room-context.service";
import {RoomRemoteService} from "./room-remote.service";
import {Operation, OPERATIONS_IN, OperationType} from "../common/operations";
import {BehaviorSubject} from "rxjs";
import {DataConnection, Peer} from "peerjs";
import {User} from "./user";
import {getUserColor} from "./color-palete";
import {APP_SETTINGS, AppSettings} from "../common/app-settings";

@Injectable()
export class RoomConnectionService {
  // create peer
  peer = new Peer(this.context.connectionId, this.appSettings.peerServer);

  network = new Map<string, DataConnection>();
  users = new Map<string, User>([[this.context.connectionId, {id: this.context.connectionId, name: this.context.name, color: getUserColor()}]]);
  users$ = new BehaviorSubject<User[]>([]);
  constructor(
    private readonly context: RoomContextService,
    private readonly remote: RoomRemoteService,
    @Inject(OPERATIONS_IN) private readonly opStream: BehaviorSubject<Operation | null>,
    @Inject(APP_SETTINGS) private readonly appSettings: AppSettings
  ) {
    this.open();
    const self = this.users.get(this.context.connectionId)
    if(self){
      this.clientUpdate(self);
    }
  }

  open():void {
    this.peer.on('open', (id: string)=>{
      console.log('[PEER ID]:', id);
      this.addConnectionListener();
      if(!this.context.isHost) {
        this.connectTo(this.context.roomId);
      }
    })
  }

  connectTo(id: string): void {
    if(this.network.has(id)){return;}
    const conn = this.peer.connect(id);
    conn.on('open', () => {
      console.log(`==> connected to ${id}`);
      this.network.set(id, conn);
      this.sendTo(id, {type: OperationType.Whoami, data: {name: this.context.name, userId: this.context.connectionId, color: getUserColor(), id: this.context.connectionId}})
      if(id === this.context.roomId){
        this.sendTo(this.context.roomId, {type: OperationType.GetState, data: {userId: this.context.userId}})
      }

      conn.on('data', (data)=>{
        this.receiveData(conn.peer, data);
      })
      conn.on('close', () => {
        this.removeClient(conn);
      });
      if(!this.context.isHost) {
        this.sendTo(this.context.roomId, {type: OperationType.Whoami, data: {userId: this.context.connectionId, id: this.context.userId, name: this.context.name, color: getUserColor()}})
      }
    });

  }

  addConnectionListener() {
    this.peer.on('connection', (conn) => {
      console.log(`[ NEW CONNECTION FROM ]: ${conn.peer}`);
      this.addClient(conn);
      this.connectTo(conn.peer);
      conn.on('open', () => {
        console.log('channel open');
        conn.on('data', (data)=>{
          this.receiveData(conn.peer, data);
        })
        conn.on('close', () => {
          this.removeClient(conn);
        });
        // conn.send({type: OperationType.Whoami, data:{id: this.context.connectionId, name: this.context.name}});
        if(this.context.isHost) {
          this.sendAll({type: OperationType.UserList, data: [...this.users.values()].map((u)=>({
              id: u.id,
              name: u.name,
              color: u.color,
            })) });
        }
      });
    });
  }

  receiveData(from: string, data: unknown): void {
    console.log('from', from, 'data', JSON.stringify(data));
    if(this.isOperation(data)){

      if(data.type === OperationType.Whoami){
        this.clientUpdate(data.data);
      }
      if(data.type === OperationType.UserList) {
        data.data.forEach((user)=> this.clientUpdate(user));
      }

      this.opStream.next(data as Operation);
    }

  }

  isOperation(data: unknown): data is Operation {
    const dataOperation = data as Operation;

    return (!!data && dataOperation.type && Object.values(OperationType).indexOf(dataOperation.type)!==-1);
  }

  addClient(connection: DataConnection):void {
    this.network.set(connection.peer, connection);
    this.users.set(connection.peer, {id: connection.peer, color: getUserColor(), name: ''});
    this.users$.next([...this.users.values()]);
  }
  removeClient(connection: DataConnection): void {
    this.network.delete(connection.peer);
    this.users.delete(connection.peer);
    this.users$.next([...this.users.values()]);
  }


  sendTo(id: string, data: Operation){
    if(this.network.has(id)){
      this.network.get(id)?.send(data);
    }
  }

  sendAll(operation: Operation) {
    for(let peer of this.network.values()){
      peer.send(operation);
    }
  }

  clientUpdate(client: Pick<User, 'id'| 'name' | 'color'>){
    if(this.users.has(client.id)){
      const usr = this.users.get(client.id);

      if(usr){

        usr.color = usr.color || getUserColor()
        usr.name =  usr.name || client.name

        if(!usr.cursor){
          usr.cursor = this.remote.cursor?.addCursor(client.id, usr.color || getUserColor(), client.name);
        }
        if(!usr.selection){
          usr.selection = this.remote.selection?.addSelection(client.id, usr.color || getUserColor(), client.name);
        }
      }
    }else {
      const color = client.color || getUserColor();
      const usr = {
        ...client,
        cursor: this.remote.cursor?.addCursor(client.id, color, client.name),
        selection: this.remote.selection?.addSelection(client.id, color, client.name),
      };
      this.users.set(client.id, usr);
    }
    this.users$.next([...this.users.values()]);

  }


}
