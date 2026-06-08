import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 4000;

  // Enable CORS for frontend requests
  app.enableCors({
    origin: [
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      'https://daptive-fraud-framework-frontend.vercel.app',
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Adaptive Fraud Framework API')
    .setDescription(
      'Authentication, session tracking, and behavioral telemetry API.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(port);

  const apiUrl = `http://localhost:${port}`;
  const swaggerUrl = `${apiUrl}/docs`;

  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  logger.log(`API running on: ${apiUrl}`);
  logger.log(`Swagger documentation: ${swaggerUrl}`);
}
bootstrap();
