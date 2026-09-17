import 'dotenv/config';
import { exec } from 'child_process';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import {
  ApiErrorResponseDto,
} from './common/dto/api-error-response.dto';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { applyStandardSwaggerResponses } from './common/swagger/apply-standard-responses';
import { sortSwaggerDocument } from './common/swagger/sort-swagger-document';
import { SWAGGER_TAGS } from './common/swagger/swagger-tags';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 3000);
  const apiPrefix = 'api/v1';
  const swaggerPath = 'api/docs';

  app.setGlobalPrefix(apiPrefix);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/media/',
  });

  app.enableCors({
    origin: corsOriginDelegate(collectCorsOrigins()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Taleem AI CMS API')
    .setDescription(
      'Grouped by functionality — admin endpoints appear before alumni within each tag',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag(
      SWAGGER_TAGS.AUTH_REGISTRATION,
      'Login, registration, activation, and password reset (admin & alumni)',
    )
    .addTag(SWAGGER_TAGS.DASHBOARD, 'Admin dashboard statistics')
    .addTag(
      SWAGGER_TAGS.EVENTS,
      'Event management and alumni RSVP (admin & alumni)',
    )
    .addTag(
      SWAGGER_TAGS.ANNOUNCEMENTS,
      'Announcement publishing and feed (admin & alumni)',
    )
    .addTag(
      SWAGGER_TAGS.CONTACT_REQUESTS,
      'Contact request review and submission (admin & alumni)',
    )
    .addTag(
      SWAGGER_TAGS.ALUMNI,
      'Alumni directory, cards, and analytics (admin & alumni)',
    )
    .addTag(
      SWAGGER_TAGS.PROFILE_CAREER,
      'Alumni profile, professional, and academic self-service',
    )
    .addTag(
      SWAGGER_TAGS.CATALOG,
      'Campuses, degrees, programs, and degree offerings',
    )
    .build();

  const document = sortSwaggerDocument(
    applyStandardSwaggerResponses(
      SwaggerModule.createDocument(app, swaggerConfig, {
        extraModels: [ApiErrorResponseDto],
      }),
    ),
  );
  SwaggerModule.setup(swaggerPath, app, document);

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && req.path === '/') {
      return res.redirect(`/${swaggerPath}`);
    }
    return next();
  });

  await app.listen(port);

  const swaggerUrl = `http://localhost:${port}/${swaggerPath}`;
  logger.log(`Server running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger UI: ${swaggerUrl}`);
  logger.log(
    `Storage driver: ${(process.env.STORAGE_DRIVER ?? 'local').toLowerCase()}`,
  );

  if (process.env.OPEN_SWAGGER !== 'false') {
    openBrowser(swaggerUrl);
  }
}

function originFromUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function collectCorsOrigins(): Set<string> {
  const extras = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => originFromUrl(value) ?? value);

  return new Set(
    [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'https://taleem-ai-cms.vercel.app',
      'https://taleem-ai-admin.vercel.app',
      'https://taleem-tenant.vercel.app',
      originFromUrl(process.env.ADMIN_PORTAL_URL),
      originFromUrl(process.env.ALUMNI_PORTAL_URL),
      ...extras,
    ].filter(Boolean) as string[],
  );
}

function corsOriginDelegate(allowed: Set<string>) {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowed.has(origin)) {
      callback(null, true);
      return;
    }
    if (/^https:\/\/taleem-ai-cms(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const command =
    platform === 'win32'
      ? `cmd /c start "" "${url}"`
      : platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(command, (error) => {
    if (error) {
      Logger.warn(`Could not open Swagger in browser: ${error.message}`);
    }
  });
}

bootstrap();
