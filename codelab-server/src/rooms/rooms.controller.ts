import {Controller, Get, HttpException, HttpStatus, Param, Post} from '@nestjs/common';
import {ApiTags} from "@nestjs/swagger";
import {RoomsService} from './rooms.service';

@Controller('v1/rooms')
@ApiTags('Rooms')
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) {}
    @Get()
    getAllRooms(): string[] {
        return this.roomsService.roomIds;
    }

    @Post('')
    create(): string {
        const id = this.roomsService.create();
        return JSON.stringify(id);
    }

    @Post(':id')
    createById(@Param('id') id: string): string {
        if(this.roomsService.has(id)){
            throw new HttpException('Conflict', HttpStatus.CONFLICT);
        }
        if(this.roomsService.size>1000){
            throw new HttpException('Payment', HttpStatus.PAYMENT_REQUIRED);
        }
        this.roomsService.create(id);
        return JSON.stringify(id);
    }

    @Post(`:id/users`)
    user(@Param('id') id: string): string {
        const userId = this.roomsService.join(id);
        if (!userId) {
            throw new HttpException('Room not found', HttpStatus.NOT_FOUND);
        }
        return JSON.stringify(userId);
    }

    @Get(`:id/users`)
    users(@Param('id') id: string): string[] {
        return this.roomsService.users(id);
    }
}
