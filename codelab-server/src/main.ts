import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {INestApplication} from "@nestjs/common";
import {RoomSyncServer} from './rooms/room-sync.server';
export let applicationRef: INestApplication;
async function bootstrap() {
    applicationRef = await NestFactory.create(AppModule);
    applicationRef.setGlobalPrefix('api', {exclude: ['health']});
    applicationRef.enableCors({origin : '*'});
    applicationRef.get(RoomSyncServer).attach(applicationRef.getHttpServer());
  const config = new DocumentBuilder()
      .setTitle('Codelab API')
      .setDescription('Codelab API description')
      .setVersion('1.0')
      .build();
  const document = SwaggerModule.createDocument(applicationRef, config);
  SwaggerModule.setup('api-docs', applicationRef, document);
  await applicationRef.listen(Number(process.env['PORT'] ?? 3300), '127.0.0.1');
}
bootstrap();
