import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { parseEnv } from './env';

async function bootstrap(): Promise<void> {
  const env = parseEnv(process.env);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: env.WEB_ORIGIN.split(','), credentials: true });
  await app.listen(env.PORT);
}

void bootstrap();
