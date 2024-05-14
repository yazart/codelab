import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {ExpressPeerServer} from "peer";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {INestApplication} from "@nestjs/common";
export let applicationRef: INestApplication;
async function bootstrap() {
    applicationRef = await NestFactory.create(AppModule);
    applicationRef.setGlobalPrefix('api', {exclude: ['/async', 'health']});
    applicationRef.enableCors({origin : '*'});
  const peerServer = ExpressPeerServer(applicationRef.getHttpServer(), {
        path: "/async",
        allow_discovery: true,
        key: 'codelab'
      });
    applicationRef.use(peerServer);
  const config = new DocumentBuilder()
      .setTitle('Codelab API')
      .setDescription('Codelab API description')
      .setVersion('1.0')
      .build();
  const document = SwaggerModule.createDocument(applicationRef, config);
  SwaggerModule.setup('api-docs', applicationRef, document);
  await applicationRef.listen(3300);
}
bootstrap();
