import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  setupSwagger(app);

  return app;
}

function setupSwagger(app: NestFastifyApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Quark SQLite example')
    .setDescription('Generated Quark CRUD routes backed by SQLite.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    autoTagControllers: false,
  });

  SwaggerModule.setup('api', app, document);
}

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const port = Number(process.env.PORT || 3000);

  await app.listen(port, '0.0.0.0');
  console.log(`Quark SQLite example is running on http://localhost:${port}`);
}

if (require.main === module) {
  bootstrap();
}
