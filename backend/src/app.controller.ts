import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  hello() {
    return { name: 'BrewLite API', message: 'Hello from BrewLite ☕', version: '1.0.0' };
  }

  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'up', time: new Date().toISOString() };
  }
}
