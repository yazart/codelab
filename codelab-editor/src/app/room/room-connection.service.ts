import {Inject, Injectable} from '@angular/core';
import {RoomContextService} from "./room-context.service";
import {RoomRemoteService} from "./room-remote.service";
import {Operation, OPERATIONS_IN, OperationType} from "../common/operations";
import {BehaviorSubject, filter, takeUntil} from "rxjs";
import {DataConnection, Peer} from "peerjs";
import {User} from "./user";
import {APP_SETTINGS, AppSettings} from "../common/app-settings";
import {RoomApiService} from "./room-api.service";

@Injectable()
export class RoomConnectionService {
  // create peer
  peer: Peer | undefined;
  network = new Map<string, DataConnection>();

  users = new Map<string, User>([[this.context.userId, {id: this.context.userId, name: this.context.name, color: this.context.color}]]);
  users$ = new BehaviorSubject<User[]>([...this.users.values()]);

  private onlineUsers: EventSource | undefined;
  constructor(
    private readonly context: RoomContextService,
    private readonly remote: RoomRemoteService,
    @Inject(OPERATIONS_IN) private readonly opStream: BehaviorSubject<Operation | null>,
    @Inject(APP_SETTINGS) private readonly appSettings: AppSettings,
    private readonly roomApiService: RoomApiService,
  ) {}

  open():void {
    this.peer = new Peer(this.context.userId, this.appSettings.peerServer);
    this.peer?.on('open', (id: string)=>{
      console.log('[PEER ID]:', id);
      this.addConnectionListener();
      Promise.resolve().then(()=>{
        this.roomApiService.users(this.context.roomId).subscribe((userList)=>{
          userList
            .filter((id)=> this.context.userId !== id)
            .forEach((id)=> this.connectTo(id));
          this.watchOnline();
        });
      })
    })


  }

  watchOnline():void {
    this.onlineUsers = new EventSource(`${this.appSettings.apiBase}/rooms/${this.context.roomId}/events`);
    this.onlineUsers.onmessage = ((event:MessageEvent<string>)=>{
      const users = JSON.parse(event.data);
      if(Array.isArray(users)){
        const onlineUsers = new Set(users);
        [...this.users.keys()].forEach((user)=>{
          if(!onlineUsers.has(user) && user !== this.context.userId){
            this.removeClient(user);
          }
        })
      }
    })
  }

  connectTo(id: string): void {
    if(this.network.has(id)){return;}
    const conn = this.peer?.connect(id);
    conn?.on('open', () => {
      console.log(`==> connected to ${id}`);
      this.network.set(id, conn);
      this.sendTo(id, {type: OperationType.Whoami, data: {name: this.context.name, userId: this.context.userId, color: this.context.color, id: this.context.userId}})
      this.sendTo(id, {type: OperationType.GetState, data: {userId: this.context.userId}})
      conn.on('data', (data)=>{
        this.receiveData(conn.peer, data);
      })
      conn.on('error', ()=>{console.log('error')})
    });

  }

  addConnectionListener() {
    this.peer?.on('connection', (conn) => {
      console.log(`[ NEW CONNECTION FROM ]: ${conn.peer}`);
      this.addClient(conn);
      this.connectTo(conn.peer);
      conn.on('open', () => {
        conn.on('data', (data)=>{
          this.receiveData(conn.peer, data);
        })
        conn.send({type: OperationType.Whoami, data:{id: this.context.userId, name: this.context.name, color: this.context.color}});
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
        data.data.forEach((user)=> {
          if(user.id !== this.context.userId){
            this.connectTo(user.id);
          }
          this.clientUpdate(user);
        });
      }

      this.opStream.next(data as Operation);
    }else {
      console.error(data);
    }

  }

  isOperation(data: unknown): data is Operation {
    const dataOperation = data as Operation;

    return (!!data && dataOperation.type && Object.values(OperationType).indexOf(dataOperation.type)!==-1);
  }

  addClient(connection: DataConnection):void {
    this.network.set(connection.peer, connection);
    this.users$.next([...this.users.values()]);
  }
  removeClient(id: string): void {
    this.network.delete(id);
    const deletionUser = this.users.get(id);
    deletionUser?.cursor?.dispose();
    deletionUser?.selection?.dispose();
    this.users.delete(id);
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
        usr.name =  usr.name || client.name
        if(!usr.cursor){
          usr.cursor = this.remote.cursor?.addCursor(client.id, usr.color, client.name);
        }
        if(!usr.selection){
          usr.selection = this.remote.selection?.addSelection(client.id, usr.color, client.name);
        }
      }
    }else {
      const color = client.color;
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
