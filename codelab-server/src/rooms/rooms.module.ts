import {Module} from "@nestjs/common";
import {RoomsController} from "./rooms.controller";
import {RoomsService} from './rooms.service';
import {RoomSyncServer} from './room-sync.server';

@Module({
    imports: [],
    controllers: [RoomsController],
    providers: [RoomsService, RoomSyncServer],
    exports: [RoomSyncServer],
})
export class RoomsModule {}
