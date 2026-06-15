import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  const frontendUrls = configService
  .get<string>('APP_FRONTEND_URL', '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.enableCors({
  origin: frontendUrls.length > 0 ? frontendUrls : true,
  credentials: true,
});
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(configService.get<number>('PORT', 3000));
}
bootstrap();
