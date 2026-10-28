import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { PromotionsService } from './promotions.service';

class ValidateCouponQuery {
  @IsString()
  @IsNotEmpty()
  code: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  subtotal: number;
}

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  list() {
    return this.promotions.listActive();
  }

  @Get('validate')
  validate(@Query() q: ValidateCouponQuery) {
    return this.promotions.validate(q.code, q.subtotal);
  }
}
