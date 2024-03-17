import {Inject, Injectable} from '@angular/core';
import {RoomContextService} from "./room-context.service";
import {RoomRemoteService} from "./room-remote.service";
import {Operation, OPERATIONS_IN, OperationType} from "../common/operations";
import {BehaviorSubject} from "rxjs";
import {DataConnection, Peer} from "peerjs";
import {User} from "./user";
import {getUserColor} from "./color-palete";

@Injectable()
export class RoomConnectionService {
  // create peer
  peer = new Peer(this.context.connectionId, {
    host: "localhost",
    port: 3300,
    path: "api/v1/peer",
  });

  network = new Map<string, DataConnection>();
  users = new Map<string, User>();

  constructor(
    private readonly context: RoomContextService,
    private readonly remote: RoomRemoteService,
    @Inject(OPERATIONS_IN) private readonly opStream: BehaviorSubject<Operation | null>
  ) {
    this.open();

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
    const conn = this.peer.connect(id);
    conn.on('open', () => {
      console.log(`==> connected to ${id}`);
      conn.on('data', (data)=>{
        this.receiveData(conn.peer, data);
      })
      conn.on('close', () => {
        this.removeClient(conn);
      });
    });

  }

  addConnectionListener() {
    this.peer.on('connection', (conn) => {
      console.log(`[ NEW CONNECTION FROM ]: ${conn.peer}`);
      this.addClient(conn);
      conn.on('open', () => {
        conn.on('data', (data)=>{
          this.receiveData(conn.peer, data);
        })
        conn.on('close', () => {
          this.removeClient(conn);
        });
        if(this.context.isHost) {
          this.sendAll({type: OperationType.UserList, data: [...this.users.values()].map((u)=>({
              id: u.id,
              name: u.name,
              color: u.color,
            })) })
        }
      });
    });
  }

  receiveData(from: string, data: unknown): void {
    console.log('from', from, 'data', JSON.stringify(data));
  }

  addClient(connection: DataConnection):void {
    this.network.set(connection.peer, connection);
    this.users.set(connection.peer, {id: connection.peer, color: getUserColor(), name: ''})
  }
  removeClient(connection: DataConnection): void {
    this.network.delete(connection.peer);
    this.users.delete(connection.peer)
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


}
