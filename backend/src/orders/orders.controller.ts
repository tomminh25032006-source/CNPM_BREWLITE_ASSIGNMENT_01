import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { IDEMPOTENCY_HEADER, parseIdempotencyKey } from '../common/idempotency';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
    @Headers(IDEMPOTENCY_HEADER) rawKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = parseIdempotencyKey(rawKey, false);
    const { order, replayed } = await this.orders.create(user, dto, key);
    if (replayed) res.status(HttpStatus.OK).setHeader('Idempotent-Replayed', 'true');
    return order;
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.orders.findMine(user.id);
  }

  /** Bảng điều phối của barista (phần mở rộng). Ví dụ: ?status=PAID,PREPARING */
  @Get()
  @Roles('STAFF')
  listForStaff(@Query('status') status?: string) {
    if (!status) return this.orders.listForStaff();
    const statuses = status.split(',').map((s) => s.trim().toUpperCase());
    const invalid = statuses.filter((s) => !(s in OrderStatus));
    if (invalid.length) throw new BadRequestException(`Trạng thái không hợp lệ: ${invalid.join(', ')}`);
    return this.orders.listForStaff(statuses as OrderStatus[]);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.findOne(user, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.cancel(user, id);
  }

  @Patch(':id/status')
  @Roles('STAFF')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatusByStaff(id, dto.status);
  }
}
