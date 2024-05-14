import {Controller, Get, HttpException, HttpStatus, Param, Post, Sse} from '@nestjs/common';
import {v4} from 'uuid';
import {ApiTags} from "@nestjs/swagger";
import {Cron, CronExpression} from "@nestjs/schedule";
import {BehaviorSubject, distinct, distinctUntilChanged, map, Observable, tap} from "rxjs";
import {HttpAdapterHost, NestApplication, NestApplicationContext} from "@nestjs/core";
import {applicationRef} from "../main";
const roomsMap =  new Map<string, string[]>();
const usersMap = new Map<string, string>();
const users$ = new BehaviorSubject<string[]>([]);

@Controller('v1/rooms')
@ApiTags('Rooms')
export class RoomsController {
    constructor(
        private adapterHost: HttpAdapterHost,
    ) {}
    @Get()
    getAllRooms(): string[] {
        return [...roomsMap.keys()];
    }

    @Post('')
    create(): string {
        const id = v4();
        roomsMap.set(id, [id])
        return JSON.stringify(id);
    }

    @Post(':id')
    createById(@Param('id') id: string): string {
        if(roomsMap.has(id)){
            throw new HttpException('Conflict', HttpStatus.CONFLICT);
        }
        if(roomsMap.size>1000){
            throw new HttpException('Payment', HttpStatus.PAYMENT_REQUIRED);
        }
        roomsMap.set(id, [id]);
        usersMap.set(id, id);
        return JSON.stringify(id);
    }

    @Post(`:id/users`)
    user(@Param('id') id: string): string {
        const userId = v4();
        const room = roomsMap.get(id);
        room.push(userId);
        usersMap.set(userId, id);
        return JSON.stringify(userId);
    }

    @Get(`:id/users`)
    users(@Param('id') id: string): string[] {
        return roomsMap.get(id) || [];
    }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async handleCron() {
        applicationRef.getUrl().then((url)=>fetch(url+ '/async/codelab/peers'))
            .then((resp)=>resp.json())
            .catch(()=>{
                return null;
            })
            .then((u)=>{
                if(u){
                    users$.next(u);
                }
            })
    }

    @Sse(':id/events')
    sse(@Param('id') id: string): Observable<MessageEvent<string[]>> {
        return users$.pipe(
            map((e)=>{
                return { data: e } as MessageEvent<string[]>
            }),
        )
    }
}
