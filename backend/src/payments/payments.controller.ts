import { Body, Controller, Headers, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { IDEMPOTENCY_HEADER, parseIdempotencyKey } from '../common/idempotency';
import { CreatePaymentDto } from './dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  async pay(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentDto,
    @Headers(IDEMPOTENCY_HEADER) rawKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = parseIdempotencyKey(rawKey, true)!;
    const result = await this.payments.pay(user, dto, key);
    if (result.replayed) res.status(HttpStatus.OK).setHeader('Idempotent-Replayed', 'true');
    return result;
  }
}
