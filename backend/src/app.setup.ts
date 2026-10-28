import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/** Cấu hình dùng chung cho main.ts và integration test. */
export function configureApp(app: INestApplication, corsOrigin = 'http://localhost:3000') {
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Idempotent-Replayed', 'X-Response-Time'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // NFR: theo dõi thời gian phản hồi API (< 500ms với dữ liệu mẫu)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    const writeHead = res.writeHead;
    res.writeHead = function (this: Response, ...args: Parameters<Response['writeHead']>) {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      this.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`);
      return writeHead.apply(this, args);
    } as Response['writeHead'];
    next();
  });
}
