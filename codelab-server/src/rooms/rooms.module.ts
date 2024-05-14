import {Module} from "@nestjs/common";
import {RoomsController} from "./rooms.controller";
import {NestApplication} from "@nestjs/core";

@Module({
    imports: [],
    controllers: [RoomsController],
    providers: []
})
export class RoomsModule {}