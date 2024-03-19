import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {ExpressPeerServer} from "peer";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
      ExpressPeerServer(app.getHttpServer(), {
        path: "api/v1/peer",
      }),
  );
  await app.listen(3300);
}
bootstrap();
