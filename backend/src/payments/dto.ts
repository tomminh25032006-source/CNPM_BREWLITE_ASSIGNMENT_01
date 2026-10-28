import { PaymentMethod } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, Matches, Min, ValidateIf } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  orderId: number;

  @IsEnum(PaymentMethod, { message: 'Phương thức phải là WALLET hoặc CARD' })
  method: PaymentMethod;

  @ValidateIf((o: CreatePaymentDto) => o.method === 'CARD')
  @Matches(/^[0-9 ]{12,23}$/, { message: 'Số thẻ không hợp lệ' })
  cardNumber?: string;

  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
