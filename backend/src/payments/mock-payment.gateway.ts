import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface ChargeRequest {
  amount: number;
  method: PaymentMethod;
  cardNumber?: string;
  simulateFailure?: boolean;
}

export type ChargeResult =
  | { success: true; transactionRef: string }
  | { success: false; reason: string };

/** Hạn mức mỗi giao dịch ví điện tử (giả lập). */
const WALLET_LIMIT = 2_000_000;

/**
 * Cổng thanh toán giả lập (mô phỏng MoMo/VNPay/Stripe).
 * Quy tắc test:
 *  - Thẻ kết thúc bằng 0002 → bị từ chối; 9995 → không đủ số dư.
 *  - Ví điện tử: giao dịch > 2.000.000đ → vượt hạn mức.
 *  - simulateFailure = true → luôn lỗi (dùng khi demo).
 */
@Injectable()
export class MockPaymentGateway {
  private readonly delayMs: number;

  constructor(config: ConfigService) {
    this.delayMs = Number(config.get('MOCK_PAYMENT_DELAY_MS', 600));
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));

    if (req.simulateFailure) return { success: false, reason: 'Giao dịch bị từ chối (mô phỏng lỗi)' };

    if (req.method === 'CARD') {
      const digits = (req.cardNumber ?? '').replace(/\s+/g, '');
      if (digits.endsWith('0002')) return { success: false, reason: 'Thẻ bị ngân hàng từ chối' };
      if (digits.endsWith('9995')) return { success: false, reason: 'Số dư thẻ không đủ' };
    } else if (req.amount > WALLET_LIMIT) {
      return { success: false, reason: 'Vượt hạn mức giao dịch của ví' };
    }

    const prefix = req.method === 'CARD' ? 'CARD' : 'WALLET';
    return { success: true, transactionRef: `${prefix}-${randomBytes(5).toString('hex').toUpperCase()}` };
  }
}
