import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {RoomsModule} from "./rooms/rooms.module";
import {ScheduleModule} from "@nestjs/schedule";

@Module({
  imports: [RoomsModule,  ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
