import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS')
    .split(',');

  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.use(helmet());
  app.use(clerkMiddleware());

  app.enableVersioning({ prefix: 'api/v1', type: VersioningType.URI });

  const config = new DocumentBuilder()
    .setTitle('RecruitMind API')
    .setDescription('Recruitmind is an API for AI based recruitment')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
