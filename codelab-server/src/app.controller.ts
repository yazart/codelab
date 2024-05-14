import {Controller, Get, Header} from '@nestjs/common';
import { AppService } from './app.service';
import {ApiTags} from "@nestjs/swagger";

@Controller()
@ApiTags('Maintenance')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/health')
  @Header('Content-Type', 'application/json; charset=utf-8')
  health(): string {
    return 'OK';
  }
}
