import 'reflect-metadata';
import './common/env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { Db } from './common/db';
import { Errors } from './common/errors';
import { origins, prod } from './common/env';
import { migrate } from './migrations';
async function main() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({ origin: origins, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Authorization','Content-Type','Accept','Cookie','X-Requested-With'], exposedHeaders: ['Authorization','Set-Cookie','Content-Disposition'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }));
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  if (process.env.MIGRATIONS_ENABLED !== 'false') await migrate(app.get(Db));
  if (!prod && process.env.SWAGGER_ENABLED !== 'false') {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('NexusOS API').setVersion('1.0').addBearerAuth().addCookieAuth('nexusos_access_token').build());
    SwaggerModule.setup('swagger-ui.html', app, doc, { jsonDocumentUrl: '/v3/api-docs' });
  }
  await app.listen(Number(process.env.PORT || process.env.SERVER_PORT || 8080), process.env.HOST || '0.0.0.0');
}
main().catch(error => { console.error(error); process.exit(1); });
