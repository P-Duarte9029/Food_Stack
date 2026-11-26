import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { parseEnv } from './env';

async function bootstrap(): Promise<void> {
  const env = parseEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: env.WEB_ORIGIN.split(','), credentials: true });
  // Atrás de proxy (Cloud Run), sem isso todo cliente teria o IP do proxy no limite de login.
  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);
  // A navegação do front é por hash, então basta servir os arquivos estáticos (sem fallback).
  if (env.WEB_DIST_DIR && existsSync(env.WEB_DIST_DIR)) app.useStaticAssets(env.WEB_DIST_DIR);
  await app.listen(env.PORT, '0.0.0.0');
}

void bootstrap();
