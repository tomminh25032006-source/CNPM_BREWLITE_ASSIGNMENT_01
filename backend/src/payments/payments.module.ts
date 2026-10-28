import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { MockPaymentGateway } from './mock-payment.gateway';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PromotionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentGateway],
})
export class PaymentsModule {}
