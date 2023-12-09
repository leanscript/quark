import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  if ((process.env.NODE_ENV as string) !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Api Generator')
      .setDescription('Api Generator schema')
      .setVersion('0.1')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }
  app.enableCors();
  await app.listen(process.env.EXPOSE_API_PORT, '0.0.0.0');
}
bootstrap();
